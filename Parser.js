var CSVParser = require('csvparser');
var EventEmitter = require('emitter');

var defaultRenderer = require('./renderer.js');

var DEFAULT_MODE = 'csv';

var supportedModes = {
	csv: {
		displayName: 'CSV',
		fileType: 'text/csv'
	},
	json: {
		displayName: 'JSON',
		fileType: 'application/json'
	}
};

function inherits(Child, Parent) {
	Child.prototype = Object.create(Parent.prototype, {
		constructor: { value: Child, enumerable: false, writable: true, configurable: true }
	});
}

function createButton(value) {
	var button = document.createElement('INPUT');
	button.type = 'button';
	button.value = value;

	button.show = function () {
		button.style.display = '';
	};

	button.hide = function () {
		button.style.display = 'none';
	};

	return button;
}

function readFile(file, cb) {
	var reader = new FileReader();

	reader.onload = function (file) {
		cb(file);
	};

	reader.readAsText(file);
}

function removeAllChildren(ele) {
	while (ele.childNodes.length) {
		ele.removeChild(ele.childNodes[0]);
	}
}

function createDownloadButton(parser) {
	var downloadBtn = parser.downloadBtn = createButton('Download Data');
	downloadBtn.className = 'downloadBtn';

	downloadBtn.addEventListener('click', function () {
		parser.load(function (error, data) {
			if (error) {
				console.error(error);
				return alert('Failed to load the file.');
			}

			data = JSON.stringify(data, null, '\t');

			var downloadElm = document.createElement('a');
			downloadElm.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(data));
			downloadElm.setAttribute('download', parser.cfg.name);
			downloadElm.click();
		});

	}, false);

	parser.target.appendChild(downloadBtn);
}

function createModeButton(target, mode, parser) {
	var modeObj = supportedModes[mode];
	var name = parser.cfg.name;

	var importerButton = document.createElement('INPUT');
	importerButton.setAttribute('type', 'radio');
	importerButton.setAttribute('name', name);
	importerButton.setAttribute('id', name + ':' + mode);
	importerButton.addEventListener('click', function () {
		parser.mode = mode;
		parser.dropElement.textContent = 'Drop ' + mode + ' file here';
	});

	if (mode === DEFAULT_MODE) {
		importerButton.setAttribute('checked', 'checked');
	}

	var importerLabel = document.createElement('LABEL');
	importerLabel.setAttribute('for', name + ':' + mode);
	importerLabel.appendChild(document.createTextNode(modeObj.displayName));

	target.appendChild(importerButton);
	target.appendChild(importerLabel);
}

function createModeButtons(parser) {
	var modeContainer = parser.modeButtons = document.createElement('DIV');
	modeContainer.className = 'mode';

	modeContainer.hide = function () {
		modeContainer.style.display = 'none';
	};

	modeContainer.show = function () {
		modeContainer.style.display = '';
	};

	var title = document.createElement('SPAN');
	title.textContent = 'Import Mode:';
	modeContainer.appendChild(title);

	for (var mode in supportedModes) {
		createModeButton(modeContainer, mode, parser);
	}

	parser.target.appendChild(modeContainer);
}

function createDropElement(parser) {
	var dropElement = parser.dropElement = document.createElement('DIV');
	dropElement.className = 'dropElement';
	dropElement.textContent = 'Drop csv file here';

	dropElement.addEventListener('dragover', function (e) {
		e.stopPropagation();
		e.preventDefault();
	});

	dropElement.addEventListener('drop', function (e) {
		var files = e.dataTransfer.files;

		e.stopPropagation();
		e.preventDefault();

		if (files.length) {
			var mode = parser.mode;
			var selectedMode = supportedModes[mode];

			if (files[0].type !== selectedMode.fileType) {
				return alert('File is not a ' + mode);
			}

			readFile(files[0], function (file) {
				parser.parse(file.target.result);
			});
		}
	}, false);

	dropElement.hide = function () {
		dropElement.style.display = 'none';
	};

	dropElement.show = function () {
		dropElement.style.display = '';
	};

	parser.target.appendChild(dropElement);
}

function createDataDisplay(parser) {
	var dataDisplay = parser.dataDisplay = document.createElement('DIV');
	var data = {};

	dataDisplay.hide = function () {
		dataDisplay.style.display = 'none';
	};

	dataDisplay.show = function () {
		dataDisplay.style.display = '';
	};

	dataDisplay.render = function () {
		parser.renderer(data, dataDisplay);
	};

	dataDisplay.update = function (newData) {
		data = newData;
		removeAllChildren(dataDisplay);
		dataDisplay.render();
	};

	dataDisplay.refresh = function () {
		parser.load(function (error, newData) {
			if (error) {
				console.error(error);
				return alert('Failed to load the file.');
			}

			newData = newData || { error: 'No data loaded.' };

			dataDisplay.update(newData);
		});
	};

	dataDisplay.refresh();

	parser.target.appendChild(dataDisplay);
}

function createSaveCancelButtons(parser) {
	var container = document.createElement('DIV');
	var saveButton = parser.saveButton = createButton('Save');
	var cancelButton = parser.cancelButton = createButton('Cancel');

	function saveClicked() {
		if (parser.mode === 'csv' && !parser.csvParser.isSafe && !confirm('There were errors with your data, are you sure you want to save?')) {
			return;
		}

		saveButton.hide();
		cancelButton.hide();
		parser.modeButtons.show();
		parser.dropElement.show();
		parser.dataDisplay.show();
		parser.csvParser.resultElement.hide();

		parser.save(parser.parsed, function (error) {
			if (error) {
				console.error(error);
				return alert('Failed to save the file.');
			}

			parser.dataDisplay.refresh();
		});
	}

	function cancelClicked() {
		saveButton.hide();
		cancelButton.hide();
		parser.modeButtons.show();
		parser.dropElement.show();
		parser.dataDisplay.show();
		parser.csvParser.resultElement.hide();
	}

	saveButton.addEventListener('click', saveClicked, false);
	cancelButton.addEventListener('click', cancelClicked, false);

	container.appendChild(saveButton);
	container.appendChild(cancelButton);
	parser.target.appendChild(container);

	saveButton.hide();
	cancelButton.hide();
}

function Parser(cfg, renderer) {
	EventEmitter.call(this);

	var that = this;
	this.cfg = cfg;
	this.target = cfg.target;
	this.load = cfg.loadData;
	this.save = cfg.saveData;

	this.parsed = {};
	this.mode = DEFAULT_MODE;
	this.renderer = renderer || defaultRenderer;

	createDownloadButton(this);
	createModeButtons(this);
	createDropElement(this);
	createDataDisplay(this);
	createSaveCancelButtons(this);

	function dataParsed(parsed) {
		that.parsed = parsed;
		that.displayParsed();
	}

	this.on('parsed', dataParsed);

	this.csvParser = new CSVParser(cfg);
	this.csvParser.on('parsed', dataParsed);
}

inherits(Parser, EventEmitter);

Parser.prototype.parseJSON = function (result) {
	var parsedData;
	try {
		parsedData = JSON.parse(result);

	} catch (e) {
		console.error(e);
		return alert('Failed to parse the file.');
	}

	this.emit('parsed', parsedData);
};

Parser.prototype.parse = function (result) {
	var that = this;
	var parseFunc = {
		csv: function (result) {
			that.csvParser.parseCSV(result);
		},
		json: function (result) {
			that.parseJSON(result);
		}
	};

	parseFunc[this.mode](result);
};

Parser.prototype.displayParsed = function () {
	this.modeButtons.hide();
	this.dropElement.hide();
	this.dataDisplay.hide();
	this.saveButton.show();
	this.cancelButton.show();
};

exports = module.exports = Parser;