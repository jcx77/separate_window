/**
 * Author: Belousov Alexandr
 */
var storage = chrome.storage.local;
export var Storage = {
	prop:['css','name','icon','size'],
	_setItems: function (url, items) {
		if (items.css.length == 0) {
			storage.remove(url);
		} else {
			var itemsObj = {};
			itemsObj[url] = items;
			storage.set(itemsObj);
		}
	},
	saveSetting: function (settings) {
		storage.set({ settings: settings });
	},
	getSetting: function (callback) {
		storage.get('settings', function (itemsObj) {
			if (itemsObj) {
				callback(itemsObj);
			} else {
				callback(undefined);
			}
		});
	},
	delItem: function (url, index, callback) {
		var URL = this.normUrl(url);
		this.getItems(url, function (items) {
			this.prop.forEach(function(element) {
				if(items.hasOwnProperty(element)){
					items[element].splice(index,1);
				}
			});
			this._setItems(URL, items);
			callback();
		}.bind(this));
	},
	getItem: function (url, index, callback) {
		this.getItems(url, function (items) {
			var item = {
				selector: items.css[index],
				name: items.name[index]
			};
			callback(item);
		});
	},
	checkItems: function (URL, itemsObj) {
		var items = itemsObj[URL];
		if (!items.hasOwnProperty('icon')) {
			items['icon'] = [];
			for (var i = 0; i < items.css.length; i++) {
				items.icon.push(true);
			}
			this._setItems(URL, items);
		}
		return items;
	},
	getShowItems: function (url, callback) {
		this.getItems(url, function (items) {
			var showSelector = [];
			if (items) {
				for (var i = 0; i < items.icon.length; i++) {
					if (items.icon[i]) {
						showSelector.push(items.css[i]);
					}
				}
			}
			if (showSelector.length == 0) showSelector = undefined;
			callback(showSelector);
		});
	},
	getSize:function(url,selector,callback){
		this.getItems(url,function(items){
			let winSize=undefined;
			if(items){
				let index=items.css.indexOf(selector);
				if(index>-1 && items.hasOwnProperty('size')){
					if(items.size[index] && items.size[index]!='{}'){
						winSize=items.size[index];
					}
				}
			}
			callback(winSize);
		});
	},
	getAllSelectors: function (url, callback) {
		this.getItems(url, function (items) {
			var selectors = undefined;
			if (items) {
				if (items.hasOwnProperty('css')) {
					selectors = items.css;
				}
			}
			callback(selectors);
		});
	},
	getItems: function (url, callback) {
		var URL = this.normUrl(url);
		storage.get(URL, function (itemsObj) {
			if (itemsObj && itemsObj.hasOwnProperty(URL)) {
				var items = Storage.checkItems(URL, itemsObj);
				callback(items);
			} else {
				callback(undefined);
			}
		});
	},
	saveProp: function (url, index, prop) {
		var URL = this.normUrl(url);
		this.getItems(url, function (items) {
			if (!items.hasOwnProperty(prop.name)){
				items[prop.name]=[];
			}
			items[prop.name][index] = prop.value;
			Storage._setItems(URL, items);
		});
	},
	addItem: function (url, selector, name) {
		if (selector == 'BODY') return;
		var URL = this.normUrl(url);
		storage.get(URL, function (itemObj) {
			var items = { css: [], name: [], icon: [], size:[] };
			if (itemObj && itemObj.hasOwnProperty(URL)) {
				items = itemObj[URL];
				if (items.css.indexOf(selector) !== -1) return;
				if (items.css.length < 3) {
					items.css.push(selector);
					items.name.push(name);
					items.icon.push(true);
					items.size.push("{}");
				} else {
					items.css.splice(0, 1);
					items.name.splice(0, 1);
					items.icon.splice(0, 1);
					items.size.splice(0,1);
					items.css.push(selector);
					items.name.push(name);
					items.icon.push(true);
					items.size.push("{}");
				}
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
		var reg = /^(https?:\/\/)?([\da-z|0-9\.-]+)\.([a-z|0-9\.]{2,6})/ig;
		var Reg = new RegExp(reg);
		return url.match(Reg);
	}
};