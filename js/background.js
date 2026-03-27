/**
 * Author: Belousov Alexandr
 */
var newTabs = {
	tabId: [],
	css: [],
	winId: [],
	newWinId: [],
	dupId: [],
	updateTab: [],
	add: function(tabId, selector, winId) {
		this.tabId.push(tabId);
		this.css.push(selector);
		this.winId.push(winId);
		this.dupId.push(0);
		this.newWinId.push(0);
	},
	addDupId: function(tabId, dupId) {
		let index = this.find(tabId);
		if (index > -1) this.dupId[index] = dupId;
	},
	addNewWinId: function(tabId, newWinId) {
		let index = this.find(tabId);
		if (index > -1) this.newWinId[index] = newWinId;
	},
	get: function(tabId) {
		var index = this.find(tabId);
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
	getSelector: function(index) {
		return this.css[index];
	},
	replace: function(tabId, prop) {
		var index = this.find(tabId);
		this[prop.name][index] = prop.value;
	},
	findDuplicate: function(dupId) {
		return this.dupId.indexOf(dupId);
	},
	findNewWin: function(winId) {
		return this.newWinId.indexOf(winId);
	},
	find: function(tabId) {
		return this.tabId.indexOf(tabId);
	},
	remove: function(index) {
		if (index == -1) return;
		this.tabId.splice(index, 1);
		this.css.splice(index, 1);
		this.winId.splice(index, 1);
		this.dupId.splice(index, 1);
		this.newWinId.splice(index, 1);
	},
	removeUpdateTab: function(tabId) {
		let index = this.updateTab.indexOf(tabId);
		if (index > -1) this.updateTab.splice(index, 1);
	}
};

var Bookmarks = {
	bookmark: {
		title: '',
		url: '',
		parentId: ''
	},
	folderId: 0,
	anchor: '#sepwin=',
	addBookmark: function(tab, url) {
		this.bookmark.title = tab.title;
		this.bookmark.url = url;
		var folderName = chrome.i18n.getMessage('folderBookMarks');
		chrome.bookmarks.search({
			title: folderName
		}, function(result) {
			if (result == 0) {
				chrome.bookmarks.create({
						parentId: '1',
						title: folderName
					},
					function(newFolder) {
						Bookmarks.bookmark.parentId = String(newFolder.id);
						Bookmarks.add();
					});
			} else {
				Bookmarks.bookmark.parentId = String(result[0].id);
				Bookmarks.add();
			}
		});
		SendMessage(tab.id, {
			cmd: 'isBookmark',
			arg: true
		});
	},
	add: function() {
		chrome.bookmarks.search({
			title: this.bookmark.title,
			url: this.bookmark.url
		}, function(result) {
			if (result.length == 0) {
				chrome.bookmarks.create(Bookmarks.bookmark);
			}
		});
	},
	checkBookmark: function(tab, url, callback) {
		chrome.bookmarks.search({
			url: url
		}, function(result) {
			if (result.length > 0) {
				callback(true);
			} else {
				callback(false);
			}
		});
	},
	delBookmark: function(tab, url) {
		chrome.bookmarks.search({
			url: url
		}, function(result) {
			if (result.length > 0) {
				chrome.bookmarks.remove(result[0].id);
				SendMessage(tab.id, {
					cmd: 'isBookmark',
					arg: false
				});
			}
		});
	}
};

var cmdFromTab = {
	apply: function(arg, tab) {
		if (newTabs.find(tab.id) == -1) {
			newTabs.add(tab.id, arg.selector, tab.windowId);
			Storage.getSize(tab.url, arg.selector, function(size) {
				var winSize = null;
				if (size) {
					winSize = JSON.parse(size);
				}
				Panel.createPop(tab.id, arg.size, winSize);
				Storage.addItem(tab.url, arg.selector, '');
			});
		}
	},
	minimizeWin: function(arg, tab) {
		Panel.updateWin(tab.windowId, {
			focused: false
		});
	},
	restoreWin: function(arg, tab) {
		Panel.updateWin(tab.windowId, {
			focused: true,
			state: 'normal'
		});
	},
	saveProp: function(arg, tab) {
		Storage.saveProp(tab.url, arg.index, arg.prop);
	},
	saveSelector: function(arg, tab) {
		var oldSelector = newTabs.get(tab.id).selector;
		Storage.getAllSelectors(tab.url, function(selectors) {
			var index = selectors.indexOf(oldSelector);
			Storage.saveProp(tab.url, index, arg.prop);
			newTabs.replace(tab.id, arg.prop);
		});
	},
	saveSize: function(arg, tab) {
		let selector = newTabs.get(tab.id).selector;
		Storage.getAllSelectors(tab.url, function(selectors) {
			let index = selectors.indexOf(selector);
			Storage.saveProp(tab.url, index, arg.prop);
		});
	},
	printScr: function(arg, tab) {
		chrome.tabs.captureVisibleTab(tab.windowId, {
			format: 'png'
		}, function(srcUrl) {
			SendMessage(tab.id, {
				cmd: 'saveImage',
				arg: {
					data: srcUrl
				}
			});
		});
	},
	fromHistory: function(index, tab) {
		Storage.getItem(tab.url, index, function(item) {
			SendMessage(tab.id, {
				cmd: 'apply',
				arg: item.selector
			});
		});
	},
	getItems: function(arg, tab) {
		Storage.getShowItems(tab.url, function(icons) {
			SendMessage(tab.id, {
				cmd: 'setItems',
				arg: {
					icons: icons,
					hideIcons: Panel.cfg.hideAllIcon
				}
			});
		});
	},
	checkTab: function(arg, tab) {
		Panel.checkTab(tab);
	},
	cancel: function(arg, tab) {
		Panel.restoreTab(tab, false);
		this.getItems('', tab);
	},
	updatePage: function(arg, tab) {
		newTabs.updateTab.push(tab.id);
	},
	unloadPage: function(arg, tab) {
		Panel.restoreTab(tab, true);
		this.getItems('', tab);
	},
	addBookmark: function(arg, tab) {
		Bookmarks.addBookmark(tab, arg.url);
	},
	delBookmark: function(arg, tab) {
		Bookmarks.delBookmark(tab, arg.url);
	},
	checkBookmark: function(arg, tab) {
		Bookmarks.checkBookmark(tab, arg.url, function(result) {
			SendMessage(tab.id, {
				cmd: 'isBookmark',
				arg: result
			});
		});
	},
	checkSaveSize: function(arg, tab) {
		Storage.getSize(tab.url, arg.selector, function(size) {
			let isSaved = false;
			if (size) {
				isSaved = true;
			}
			SendMessage(tab.id, {
				cmd: 'isSavedSize',
				arg: isSaved
			});
		});
	},
	loadPlayer: function(arg, tab) {
		chrome.webNavigation.getAllFrames({
			tabId: tab.id
		}, function(frames) {
			for (var i = 0; i < frames.length; i++) {
				if (arg.href == frames[i].url) {
					chrome.scripting.executeScript({
						target: {
							tabId: tab.id,
							frameIds: [frames[i].frameId]
						},
						files: ['js/player.js']
					}).catch(err => console.log('Script injection failed:', err));
					break;
				}
			}
		});
	},
	loadToFrame: function(arg, tab) {
		chrome.webNavigation.getAllFrames({
			tabId: tab.id
		}, function(frames) {
			frames.forEach(function(frame) {
				if (frame.parentFrameId > -1 && frame.url.indexOf('about:') == -1 && !frame.errorOccurred) {
					chrome.scripting.executeScript({
						target: {
							tabId: tab.id,
							frameIds: [frame.frameId]
						},
						files: ['js/iframe.js']
					}).catch(err => console.log('Script injection failed:', err));
				}
			});
		});
	},
	isDuplicate: function(arg, tab) {
		var i = newTabs.findDuplicate(tab.id);
		if (i > -1) {
			SendMessage(tab.id, {
				cmd: 'duplicate',
				arg: {
					selector: newTabs.getSelector(i)
				}
			});
		}
	}
};

chrome.runtime.onMessage.addListener(function(request, sender, callback) {
	console.log('background.js----- chrome.runtime.onMessage.addListener');
	if (request && sender) {
		if (request.cmd && sender.tab) {
			if (cmdFromTab.hasOwnProperty(request.cmd)) {
				cmdFromTab[request.cmd](request.arg, sender.tab);
				callback({
					answer: true
				});
			} else {
				console.log(request.cmd);
			}
		}
	}
});

function SendMessage(tabId, command) {
	chrome.tabs.sendMessage(tabId, command, function(response) {
		if (chrome.runtime.lastError) {
			// Silently fail - tab may have closed
		}
	});
}

function CheckURL() {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function(tab) {
		if (tab && tab[0] && tab[0].url) {
			if (tab[0].url.indexOf('https://chrome.') == -1 &&
				(tab[0].url.indexOf('http://') == 0 || tab[0].url.indexOf('https://') == 0 || tab[0].url.indexOf('chrome://newtab/') == 0)) {
				chrome.action.enable(tab[0].id);
			} else {
				chrome.action.disable(tab[0].id);
			}
		}
	});
}

function ToggleContextMenu(tgl) {
	console.log(tgl);
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

chrome.tabs.onRemoved.addListener(function(tabId, info) {
	console.log('background.js----- chrome.tabs.onRemoved.addListener');
	newTabs.remove(newTabs.find(tabId));
	newTabs.removeUpdateTab(tabId);
});

chrome.tabs.onUpdated.addListener(function(id, info, tab) {
	console.log('background.js----- chrome.tabs.onUpdated.addListener');
	if (info.hasOwnProperty('url')) {
		CheckURL();
	}
	let index = newTabs.updateTab.indexOf(tab.id);
	if (tab.status == 'complete' && index > -1) {
		newTabs.updateTab.splice(index, 1);
		SendMessage(tab.id, {
			cmd: 'updateEntireTab'
		});
	}
});

chrome.tabs.onActivated.addListener(function(info) {
	console.log('background.js----- chrome.tabs.onActivated.addListener')
	CheckURL();
});

chrome.windows.onFocusChanged.addListener(function(winId) {
	console.log('background.js----- chrome.windows.onFocusChanged.addListener')
	chrome.windows.getCurrent(function(curWin) {
		if (curWin.id == winId) {
			if (newTabs.findNewWin(winId) != -1) {
				ToggleContextMenu(false);
			} else {
				ToggleContextMenu(true);
			}
		}
	});
});

// Service Worker startup initialization
chrome.runtime.onInstalled.addListener(function() {
	Storage.getSetting(function(itemsObj) {
		if (itemsObj && itemsObj.hasOwnProperty('settings')) {
			Panel.setSettings(itemsObj.settings);
		}
	});
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
	console.log('background.js----- chrome.contextMenus.onClicked.addListener')
	switch (info.menuItemId) {
		case 'start':
			SendMessage(tab.id, {
				cmd: 'start'
			});
			break;
		case 'back':
			SendMessage(tab.id, {
				cmd: 'cancel'
			});
			break;
		case 'entireTab':
			SendMessage(tab.id, {
				cmd: 'entireTab'
			});
			break;
		default:
			break;
	}
});

let contextMenuId = ['start', 'entireTab', 'back'];
let contextMenuI18 = ['txtButtonChooseOff', 'txtButtonPopTabOff', 'PanelBack'];
let contextMenuCfg = ['page', 'frame', 'selection', 'link', 'editable', 'image', 'video', 'audio'];
chrome.contextMenus.removeAll(function() {
	chrome.contextMenus.create({
		'id': 'sepwin',
		'title': 'Separate Window',
		'contexts': contextMenuCfg
	});
	contextMenuId.forEach(function(item, i) {
		chrome.contextMenus.create({
			'id': item,
			'parentId': 'sepwin',
			'title': chrome.i18n.getMessage(contextMenuI18[i]),
			'contexts': contextMenuCfg
		});
	});
});

// Handle action click (replaces browser_action)
chrome.action.onClicked.addListener(function(tab) {
	SendMessage(tab.id, {
		cmd: 'start'
	});
});