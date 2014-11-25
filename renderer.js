function JSONHTMLify(data, target) {
	var elm;

	if (data === undefined) {
		return;
	}

	if (typeof data !== 'object') {
		elm = document.createElement('SPAN');
		elm.textContent = data.toString();
		elm.className = 'value';

		target.appendChild(elm);
		return;
	}

	if (data === null) {
		elm = document.createElement('SPAN');
		elm.textContent = 'null';
		elm.className = 'value null';

		target.appendChild(elm);
		return;
	}

	var keys = Object.keys(data);
	for (var i = 0; i < keys.length; i += 1) {
		var prop = keys[i];

		if (data[prop] === undefined) {
			continue;
		}

		var div = document.createElement('DIV');

		elm = document.createElement( target.className === 'key' ? 'SPAN' : 'H3');
		elm.textContent = prop + (target.className === 'key' ? ': ' : '');

		div.appendChild(elm);
		div.className = 'key';

		target.appendChild(div);

		JSONHTMLify(data[prop], div);
	}
}

exports = module.exports = JSONHTMLify;
