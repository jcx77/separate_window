//bg_panel.js
const Panel = {
	cfg: {
		isDuplicate: false,
		isCopy: false,
		isFocus: true,
		position: { left: 0, top: 0, auto: 1 },
		size: { width: 'Auto', height: 'Auto' },
		showAdvSettings: false,
		hideAllIcon: false
	},
	_moveTab: function (tabId, winId, index) {
		chrome.tabs.move(tabId, { windowId: winId, index: index }).then(() => {
			if (!chrome.runtime.lastError) {
				chrome.tabs.update(tabId, { active: true });
			}
		});
	},
	createPop: function (tabId, size, windowSize) {
		chrome.tabs.get(tabId).then(tab => {
			if (this.cfg.isDuplicate) {
				chrome.windows.getCurrent().then(win => {
					if (win.type === 'normal' && tab.url.indexOf('#sepwin') === -1) {
						chrome.tabs.duplicate(tabId).then(dupTab => {
							newTabs.addDupId(tabId, dupTab.id);
						});
					}
				});
			}
			chrome.windows.get(tab.windowId).then(window => {
				if (window.type !== 'popup') {
					chrome.tabs.query({ windowId: window.id }).then(arrTab => {
						if (arrTab.length === 1) {
							chrome.windows.create({
								top: window.top,
								left: window.left,
								width: window.width,
								height: window.height,
								focused: !this.cfg.isFocus,
								incognito: window.incognito
							});
						}
					});

					let left = null,
						top = null,
						position = this.cfg.position,
						width = size.width > 150 ? size.width : 150,
						height = size.height > 150 ? size.height : 150,
						aspect = width / height;

					if (this.cfg.size.width !== 'Auto') {
						width = Math.round(this.cfg.size.width);
						if (this.cfg.size.height === 'Auto' && !size.entireTab) {
							height = Math.round(width / aspect);
						}
					}
					if (this.cfg.size.height !== 'Auto') {
						height = Math.round(this.cfg.size.height);
						if (this.cfg.size.width === 'Auto' && !size.entireTab) {
							width = Math.round(height * aspect);
						}
					}
					if (!position.auto) {
						left = size.avLeft;
						top = size.avTop;
						if (!position.left) { left += size.avWidth - width; }
						if (!position.top) { top += size.avHeight - height; }
						left = Math.round(left);
						top = Math.round(top);
					}
					if (windowSize) {
						left = windowSize.left;
						top = windowSize.top;
						width = windowSize.width;
						height = windowSize.height;
					}
					chrome.windows.create({
						left: left,
						top: top,
						tabId: tabId,
						width: width,
						height: height,
						focused: this.cfg.isFocus,
						type: 'popup',
						incognito: window.incognito
					}).then(newWindow => {
						newTabs.addNewWinId(tabId, newWindow.id);
						SendMessage(tabId, { cmd: 'modifyURL', arg: false });
					});
				}
			});
		});
	},
	checkTab: function (tab) {
		chrome.windows.get(tab.windowId).then(window => {
			if (window.type === 'popup') {
				this.restoreTab(tab, false);
			}
		});
	},
	restoreTab: function (tab, unload = false) {
		let incognito = tab.incognito;
		let index = newTabs.find(tab.id);
		let prop = {
			tabId: tab.id,
			winId: -1,
		};
		if (index > -1) {
			prop = newTabs.get(tab.id);
		}
		chrome.windows.get(prop.winId).then(window => {
			if (!chrome.runtime.lastError && window) {
				if (this.cfg.isDuplicate && !this.cfg.isCopy && !unload) {
					chrome.tabs.get(prop.dupId).then(dupTab => {
						let pos = -1;
						if (!chrome.runtime.lastError) {
							pos = dupTab.index;
							chrome.tabs.remove(prop.dupId);
						}
						this._moveTab(prop.tabId, window.id, pos);
					});
				} else {
					this._moveTab(prop.tabId, window.id, -1);
				}
			} else {
				chrome.windows.getAll({ windowTypes: ['normal'] }).then(allWin => {
					let winId = -1;
					for (let i = 0; i < allWin.length; i++) {
						if (allWin[i].incognito === incognito) {
							winId = allWin[i].id;
							break;
						}
					}
					if (winId > -1) {
						this._moveTab(prop.tabId, winId, -1);
					} else {
						chrome.windows.create({
							tabId: prop.tabId,
							focused: true,
							type: 'normal',
							state: 'maximized',
							incognito: incognito
						});
					}
				});
			}
		});
		newTabs.remove(index);
	},
	updateWin: function (winId, state) {
		chrome.windows.update(winId, state);
	},
	saveSetting: function () {
		Storage.saveSetting({ cfg: this.cfg });
	},
	setSettings: function (items) {
		if (items.hasOwnProperty('cfg')) {
			for (let item in items.cfg) {
				if (this.cfg.hasOwnProperty(item)) this.cfg[item] = items.cfg[item];
			}
		}
	}
};

//storage.js
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
			console.log(items);
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


//backgroud.js

// 管理标签页的状态
const newTabs = {
	tabId: [],
	css: [],
	winId: [],
	newWinId: [],
	dupId: [],
	updateTab: [],
	add(tabId, selector, winId) {
		this.tabId.push(tabId);
		this.css.push(selector);
		this.winId.push(winId);
		this.dupId.push(0);
		this.newWinId.push(0);
	},
	addDupId(tabId, dupId) {
		let index = this.find(tabId);
		if (index > -1) this.dupId[index] = dupId;
	},
	addNewWinId(tabId, newWinId) {
		let index = this.find(tabId);
		if (index > -1) this.newWinId[index] = newWinId;
	},
	get(tabId) {
		const index = this.find(tabId);
		if (index > -1) {
			return {
				tabId: this.tabId[index],
				selector: this.css[index],
				winId: this.winId[index],
				dupId: this.dupId[index],
				newWinId: this.newWinId[index]
			};
		}
	},
	getSelector(index) {
		return this.css[index];
	},
	replace(tabId, prop) {
		const index = this.find(tabId);
		this[prop.name][index] = prop.value;
	},
	findDuplicate(dupId) {
		return this.dupId.indexOf(dupId);
	},
	findNewWin(winId) {
		return this.newWinId.indexOf(winId);
	},
	find(tabId) {
		return this.tabId.indexOf(tabId);
	},
	remove(index) {
		if (index == -1) return;
		this.tabId.splice(index, 1);
		this.css.splice(index, 1);
		this.winId.splice(index, 1);
		this.dupId.splice(index, 1);
		this.newWinId.splice(index, 1);
	},
	removeUpdateTab(tabId) {
		const index = this.updateTab.indexOf(tabId);
		if (index > -1) this.updateTab.splice(index, 1);
	}
};

// 书签管理
const Bookmarks = {
	bookmark: {
		title: '',
		url: '',
		parentId: ''
	},
	folderId: 0,
	anchor: '#sepwin=',
	addBookmark(tab, url) {
		this.bookmark.title = tab.title;
		this.bookmark.url = url;
		const folderName = chrome.i18n.getMessage('folderBookMarks');
		chrome.bookmarks.search({ title: folderName }, (result) => {
			if (result == 0) {
				chrome.bookmarks.create({
					parentId: '1',
					title: folderName
				}, (newFolder) => {
					this.bookmark.parentId = String(newFolder.id);
					this.add();
				});
			} else {
				this.bookmark.parentId = String(result[0].id);
				this.add();
			}
		});
		SendMessage(tab.id, { cmd: 'isBookmark', arg: true });
	},
	add() {
		chrome.bookmarks.search({ title: this.bookmark.title, url: this.bookmark.url }, (result) => {
			if (result.length == 0) {
				chrome.bookmarks.create(this.bookmark);
			}
		});
	},
	checkBookmark(tab, url, callback) {
		chrome.bookmarks.search({ url: url }, (result) => {
			callback(result.length > 0);
		});
	},
	delBookmark(tab, url) {
		chrome.bookmarks.search({ url: url }, (result) => {
			if (result.length > 0) {
				chrome.bookmarks.remove(result[0].id);
				SendMessage(tab.id, { cmd: 'isBookmark', arg: false });
			}
		});
	}
};

// 处理来自标签页的命令
const cmdFromTab = {
	apply(arg, tab) {
		if (newTabs.find(tab.id) == -1) {
			newTabs.add(tab.id, arg.selector, tab.windowId);
			Storage.getSize(tab.url, arg.selector, (size) => {
				let winSize = null;
				if (size) {
					winSize = JSON.parse(size);
				}
				Panel.createPop(tab.id, arg.size, winSize);
				Storage.addItem(tab.url, arg.selector, '');
			});
		}
	},
	minimizeWin(arg, tab) {
		Panel.updateWin(tab.windowId, { focused: false });
	},
	restoreWin(arg, tab) {
		Panel.updateWin(tab.windowId, { focused: true, state: 'normal' });
	},
	saveProp(arg, tab) {
		Storage.saveProp(tab.url, arg.index, arg.prop);
	},
	saveSelector(arg, tab) {
		const oldSelector = newTabs.get(tab.id).selector;
		Storage.getAllSelectors(tab.url, (selectors) => {
			const index = selectors.indexOf(oldSelector);
			Storage.saveProp(tab.url, index, arg.prop);
			newTabs.replace(tab.id, arg.prop);
		});
	},
	saveSize(arg, tab) {
		const selector = newTabs.get(tab.id).selector;
		Storage.getAllSelectors(tab.url, (selectors) => {
			const index = selectors.indexOf(selector);
			Storage.saveProp(tab.url, index, arg.prop);
		});
	},
	printScr(arg, tab) {
		chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (srcUrl) => {
			SendMessage(tab.id, { cmd: 'saveImage', arg: { data: srcUrl } });
		});
	},
	fromHistory(index, tab) {
		Storage.getItem(tab.url, index, (item) => {
			SendMessage(tab.id, { cmd: 'apply', arg: item.selector });
		});
	},
	getItems(arg, tab) {
		Storage.getShowItems(tab.url, (icons) => {
			SendMessage(tab.id, {
				cmd: 'setItems',
				arg: { icons: icons, hideIcons: Panel.cfg.hideAllIcon }
			});
		});
	},
	checkTab(arg, tab) {
		Panel.checkTab(tab);
	},
	cancel(arg, tab) {
		Panel.restoreTab(tab, false);
		this.getItems('', tab);
	},
	updatePage(arg, tab) {
		newTabs.updateTab.push(tab.id);
	},
	unloadPage(arg, tab) {
		Panel.restoreTab(tab, true);
		this.getItems('', tab);
	},
	addBookmark(arg, tab) {
		Bookmarks.addBookmark(tab, arg.url);
	},
	delBookmark(arg, tab) {
		Bookmarks.delBookmark(tab, arg.url);
	},
	checkBookmark(arg, tab) {
		Bookmarks.checkBookmark(tab, arg.url, (result) => {
			SendMessage(tab.id, { cmd: 'isBookmark', arg: result });
		});
	},
	checkSaveSize(arg, tab) {
		Storage.getSize(tab.url, arg.selector, (size) => {
			const isSaved = !!size;
			SendMessage(tab.id, { cmd: 'isSavedSize', arg: isSaved });
		});
	},
	loadPlayer(arg, tab) {
		chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
			frames.forEach(frame => {
				if (arg.href == frame.url) {
					chrome.scripting.executeScript({
						target: { tabId: tab.id, frameIds: [frame.frameId] },
						files: ['js/player.js']
					});
				}
			});
		});
	},
	loadToFrame(arg, tab) {
		chrome.webNavigation.getAllFrames({ tabId: tab.id }, (frames) => {
			frames.forEach(frame => {
				if (frame.parentFrameId > -1 && frame.url.indexOf('about:') == -1 && !frame.errorOccurred) {
					chrome.scripting.executeScript({
						target: { tabId: tab.id, frameIds: [frame.frameId] },
						files: ['js/iframe.js']
					});
				}
			});
		});
	},
	isDuplicate(arg, tab) {
		const i = newTabs.findDuplicate(tab.id);
		if (i > -1) {
			SendMessage(tab.id, { cmd: 'duplicate', arg: { selector: newTabs.getSelector(i) } });
		}
	}
};

// 监听来自其他脚本的消息
chrome.runtime.onMessage.addListener((request, sender, callback) => {
	if (request && sender && request.cmd && sender.tab) {
		if (cmdFromTab.hasOwnProperty(request.cmd)) {
			cmdFromTab[request.cmd](request.arg, sender.tab);
			callback({ answer: true });
		} else {
			console.log(request.cmd);
		}
	}
});

function SendMessage(tabId, command) {
	chrome.tabs.sendMessage(tabId, command);
}

function CheckURL() {
	chrome.tabs.query({ active: true, currentWindow: true }, (tab) => {
		if (tab && tab[0] && tab[0].url) {
			const url = tab[0].url;
			if (url.indexOf('https://chrome.') == -1 &&
				(url.indexOf('http://') == 0 || url.indexOf('https://') == 0 || url.indexOf('chrome://newtab/') == 0)) {
				chrome.action.enable(tab[0].id);
			} else {
				chrome.action.disable(tab[0].id);
			}
		}
	});
}

function ToggleContextMenu(tgl) {
	chrome.contextMenus.update('start', {
		'enabled': tgl
	});
	chrome.contextMenus.update('entireTab', {
		'enabled': tgl
	});
	chrome.contextMenus.update('back', {
		'enabled': !tgl
	});
}

// 监听标签页和窗口事件
chrome.tabs.onRemoved.addListener((tabId, info) => {
	newTabs.remove(newTabs.find(tabId));
	newTabs.removeUpdateTab(tabId);
});

chrome.tabs.onUpdated.addListener((id, info, tab) => {
	if (info.hasOwnProperty('url')) { CheckURL(); }
	const index = newTabs.updateTab.indexOf(tab.id);
	if (tab.status === 'complete' && index > -1) {
		newTabs.updateTab.splice(index, 1);
		SendMessage(tab.id, { cmd: 'updateEntireTab' });
	}
});

chrome.tabs.onActivated.addListener(() => {
	CheckURL();
});

chrome.windows.onFocusChanged.addListener((winId) => {
	chrome.windows.getCurrent((curWin) => {
		if (curWin.id == winId) {
			ToggleContextMenu(newTabs.findNewWin(winId) == -1);
		}
	});
});

chrome.runtime.onStartup.addListener(() => {
	Storage.getSetting((itemsObj) => {
		if (itemsObj && itemsObj.hasOwnProperty('settings')) {
			Panel.setSettings(itemsObj.settings);
		}
	});
});
let contextMenuId = ['start', 'entireTab', 'back'];
let contextMenuI18 = ['txtButtonChooseOff', 'txtButtonPopTabOff', 'PanelBack'];
let contextMenuCfg = ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio'];
// 创建上下文菜单
chrome.contextMenus.removeAll(() => {
	chrome.contextMenus.create({
		'id': 'sepwin',
		'title': 'Separate Window',
		'contexts': contextMenuCfg
	});
	contextMenuId.forEach((item, i) => {
		chrome.contextMenus.create({
			'id': item,
			'parentId': 'sepwin',
			'title': chrome.i18n.getMessage(contextMenuI18[i]),
			'contexts': contextMenuCfg
		});
	});
});
