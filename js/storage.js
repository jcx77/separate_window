const storage = chrome.storage.local;

const Storage = {
	prop: ['css', 'name', 'icon', 'size'],

	_setItems: function (url, items) {
		if (items.css.length == 0) {
			storage.remove(url);
		} else {
			const itemsObj = {};
			itemsObj[url] = items;
			storage.set(itemsObj);
		}
	},

	saveSetting: function (settings) {
		storage.set({ settings: settings });
	},

	getSetting: function (callback) {
		storage.get('settings', function (itemsObj) {
			callback(itemsObj || undefined);
		});
	},

	delItem: function (url, index, callback) {
		const URL = this.normUrl(url);
		this.getItems(url, function (items) {
			if (items) {
				this.prop.forEach(element => {
					if (items.hasOwnProperty(element)) {
						items[element].splice(index, 1);
					}
				});
				this._setItems(URL, items);
				callback();
			}
		}.bind(this));
	},

	getItem: function (url, index, callback) {
		this.getItems(url, function (items) {
			if (items) {
				const item = {
					selector: items.css[index],
					name: items.name[index]
				};
				callback(item);
			} else {
				callback(undefined);
			}
		});
	},

	checkItems: function (URL, itemsObj) {
		let items = itemsObj[URL];
		if (!items.hasOwnProperty('icon')) {
			items['icon'] = [];
			for (let i = 0; i < items.css.length; i++) {
				items.icon.push(true);
			}
			this._setItems(URL, items);
		}
		return items;
	},

	getShowItems: function (url, callback) {
		this.getItems(url, function (items) {
			const showSelector = items ? items.css.filter((_, i) => items.icon[i]) : undefined;
			callback(showSelector.length > 0 ? showSelector : undefined);
		});
	},

	getSize: function (url, selector, callback) {
		this.getItems(url, function (items) {
			let winSize = undefined;
			if (items) {
				const index = items.css.indexOf(selector);
				if (index > -1 && items.hasOwnProperty('size')) {
					winSize = items.size[index] !== '{}' ? items.size[index] : undefined;
				}
			}
			callback(winSize);
		});
	},

	getAllSelectors: function (url, callback) {
		this.getItems(url, function (items) {
			const selectors = items ? items.css : undefined;
			callback(selectors);
		});
	},

	getItems: function (url, callback) {
		const URL = this.normUrl(url);
		storage.get(URL, function (itemsObj) {
			const items = itemsObj && itemsObj.hasOwnProperty(URL) ? Storage.checkItems(URL, itemsObj) : undefined;
			callback(items);
		});
	},

	saveProp: function (url, index, prop) {
		const URL = this.normUrl(url);
		this.getItems(url, function (items) {
			if (items) {
				if (!items.hasOwnProperty(prop.name)) {
					items[prop.name] = [];
				}
				items[prop.name][index] = prop.value;
				Storage._setItems(URL, items);
			}
		});
	},

	addItem: function (url, selector, name) {
		if (selector === 'BODY') return;

		const URL = this.normUrl(url);
		storage.get(URL, function (itemObj) {
			let items = { css: [], name: [], icon: [], size: [] };

			if (itemObj && itemObj.hasOwnProperty(URL)) {
				items = itemObj[URL];
				if (items.css.indexOf(selector) !== -1) return;

				if (items.css.length >= 3) {
					items.css.shift();
					items.name.shift();
					items.icon.shift();
					items.size.shift();
				}

				items.css.push(selector);
				items.name.push(name);
				items.icon.push(true);
				items.size.push("{}");
			} else {
				items.css.push(selector);
				items.name.push(name);
				items.icon.push(true);
				items.size.push("{}");
			}

			Storage._setItems(URL, items);
		});
	},

	normUrl: function (url) {
		const reg = /^(https?:\/\/)?([\da-z|0-9\.-]+)\.([a-z|0-9\.]{2,6})/ig;
		return url.match(reg);
	}
};
