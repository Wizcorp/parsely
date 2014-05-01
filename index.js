var CSVParser = require('csvparser');

exports.parsers = {};
exports.staticData = {};
exports.dataListeners = {};

exports.buildQuery = function (dataSources) {
	var query = {};

	for (var i = 0; i < dataSources.length; i += 1) {
		var dataSource = dataSources[i];
		query[dataSource] = { topic: dataSource, index: [] };
	}

	return query;
};

exports.buildStaticData = function (dataSources) {
	for (var i = 0; i < dataSources.length; i += 1) {
		var dataSource = dataSources[i];
		exports.staticData[dataSource] = exports.staticData[dataSource] || {};
	}
};

exports.getTarget = function (name) {
	return document.getElementById(name + 'Target');
};

function updateStaticData(opName, vaultValue) {
	exports.staticData[vaultValue.topic] = vaultValue.data || {};
	for (var name in exports.dataListeners) {
		exports.dataListeners[name].onLoad(vaultValue.topic, exports.staticData);
	}
}

exports.addDataListeners = function (archivist, dataSources) {
	for (var i = 0; i < dataSources.length; i += 1) {
		var dataSource = dataSources[i];
		archivist.on(dataSource, updateStaticData);
	}
};

function getLoader(archivist, name, importer) {
	return function (cb) {
		archivist.get(importer.topic || name, [], { optional: true }, function (error, data) {
			if (error) {
				console.log('error loading', name);
			}

			cb(null, data);
		});
	};
}

function getSaver(archivist, name, importer) {
	return function (data, cb) {
		var transform = importer.transform;

		if (transform) {
			data = transform(data, exports.staticData);
		}

		archivist.set(importer.topic || name, [], data);
		archivist.distribute(cb);
	};
}

function getConfig(archivist, name, importer) {
	var config = {
		target: exports.getTarget(name),
		rules: importer.rules,
		loadData: getLoader(archivist, name, importer),
		saveData: getSaver(archivist, name, importer),
		tests: importer.tests,
		options: importer.options
	};

	function wrapTest(originalTest) {
		return function (value) {
			return originalTest(value, exports.staticData, exports.parsers);
		};
	}

	for (var test in config.tests) {
		var originalTest = config.tests[test].test;

		config.tests[test].test = wrapTest(originalTest);
	}

	return config;
}

exports.buildParsers = function (archivist, importers) {
	for (var name in importers) {
		var importer = importers[name];

		if (importer.hasOwnProperty('onLoad')) {
			importer.onLoad(null, exports.staticData);
			exports.dataListeners[name] = importer;
		}

		var config = getConfig(archivist, name, importer);
		exports.parsers[name] = new CSVParser(config);
	}
};
