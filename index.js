var CSVParser = require('csvparser');

exports.parsers = {};
exports.staticData = {};
exports.targets = {};

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

exports.getTarget = function (what) {
	return document.getElementById(what + 'Target');
};

function updateStaticData(opName, vaultValue) {
	exports.staticData[vaultValue.topic] = vaultValue.data || {};
}

exports.addDataListeners = function (archivist, dataSources) {
	for (var i = 0; i < dataSources.length; i += 1) {
		var dataSource = dataSources[i];
		archivist.on(dataSource, updateStaticData);
	}
};

function getImporter(what) {
	return require('./importers/' + what);
}

function getLoader(archivist, what) {
	return function (cb) {
		var importer = getImporter(what);

		archivist.get(importer.topic || what, [], { optional: true }, function (error, data) {
			if (error) {
				console.log('error loading', what);
			}

			cb(null, data);
		});
	};
}

function getSaver(archivist, what) {
	return function (data, cb) {
		var importer = getImporter(what);

		var transform = importer.transform;

		if (transform) {
			data = transform(data, exports.staticData);
		}

		archivist.set(importer.topic || what, [], data);
		archivist.distribute(cb);
	};
}

function getConfig(archivist, what) {
	var importer = getImporter(what);

	var config = {
		target: exports.getTarget(what),
		rules: importer.rules,
		loadData: getLoader(archivist, what),
		saveData: getSaver(archivist, what),
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

		config.tests[test] = { test: wrapTest(originalTest) };
	}

	return config;
}

exports.buildParsers = function (archivist, importers) {
	for (var i = 0; i < importers.length; i += 1) {
		var importer = importers[i];
		var config = getConfig(archivist, importer);
		exports.parsers[importer] = new CSVParser(config);
	}
};
