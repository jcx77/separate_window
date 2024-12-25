/**
 * Author: Belousov Alexandr
 */

import { Storage } from './storage.js';
import { Panel } from './bg_panel.js';
var newTabs = {
	tabId: [],
	css: [],
	winId: [],
	newWinId: [],
	dupId: [],
	updateTab: [],
	add: function (tabId, selector, winId){
		this.tabId.push(tabId);
		this.css.push(selector);
		this.winId.push(winId);
		this.dupId.push(0);
		this.newWinId.push(0);
	},
	addDupId: function (tabId, dupId) {
		let index = this.find(tabId);
		if (index > -1) this.dupId[index] = dupId;
	},
	addNewWinId: function (tabId, newWinId) {
		let index = this.find(tabId);
		if (index > -1) this.newWinId[index] = newWinId;
	},
	get: function (tabId) {
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
				},
				function (newFolder) {
					Bookmarks.bookmark.parentId = String(newFolder.id);
					Bookmarks.add();
				});
			} else {
				Bookmarks.bookmark.parentId = String(result[0].id);
				Bookmarks.add();
			}
		});
		SendMessage(tab.id, { cmd: 'isBookmark', arg: true });
	},
	add: function () {
		chrome.bookmarks.search({ title: this.bookmark.title, url: this.bookmark.url }, function (result) {
			if (result.length == 0) {
				chrome.bookmarks.create(Bookmarks.bookmark);
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
export const cmdFromTab = {
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
	loadPlayer: function (arg, tab) {
		chrome.webNavigation.getAllFrames({ tabId: tab.id }, function (frames) {
			for (var i = 0; i < frames.length; i++) {
				if (arg.href == frames[i].url) {
					chrome.tabs.executeScript(
						tab.id, {
							file: 'js/player.js', frameId: frames[i].frameId, runAt: 'document_start'
						},
						function () { });
					break;
				}
			}
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
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (tabs && tabs[0] && tabs[0].url) {
			const tab = tabs[0];
			if (tab.url.indexOf('https://chrome.') === -1 &&
				(tab.url.indexOf('http://') === 0 || tab.url.indexOf('https://') === 0 || tab.url.indexOf('chrome://newtab/') === 0)) {

				// 使用 chrome.action 代替 chrome.browserAction
				chrome.action.enable(tab.id);
			} else {
				// 使用 chrome.action 代替 chrome.browserAction
				chrome.action.disable(tab.id);
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

// 监听标签页和窗口事件
chrome.tabs.onRemoved.addListener((tabId, info) => {
	console.log('chrome.tabs.onRemoved.addListener');
	newTabs.remove(newTabs.find(tabId));
	newTabs.removeUpdateTab(tabId);
});

chrome.tabs.onUpdated.addListener((id, info, tab) => {
	console.log('chrome.tabs.onUpdated.addListener');
	if (info.hasOwnProperty('url')) { CheckURL(); }
	const index = newTabs.updateTab.indexOf(tab.id);
	if (tab.status === 'complete' && index > -1) {
		newTabs.updateTab.splice(index, 1);
		SendMessage(tab.id, { cmd: 'updateEntireTab' });
	}
});

chrome.tabs.onActivated.addListener(() => {
	console.log('chrome.tabs.onActivated.addListener');
	CheckURL();
});

chrome.windows.onFocusChanged.addListener((winId) => {
	console.log('chrome.windows.onFocusChanged.addListener');
	chrome.windows.getCurrent((curWin) => {
		console.log(curWin);
		if (curWin.id == winId) {
			ToggleContextMenu(newTabs.findNewWin(winId) == -1);
		}
	});
});

chrome.runtime.onStartup.addListener(() => {
	console.log('chrome.runtime.onStartup.addListener');
	Storage.getSetting((itemsObj) => {
		if (itemsObj && itemsObj.hasOwnProperty('settings')) {
			Panel.setSettings(itemsObj.settings);
		}
	});
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
	console.log('chrome.contextMenus.onClicked.addListener');
	switch (info.menuItemId) {
		case 'start':
			SendMessage(tab.id, { cmd: 'start' });
			break;
		case 'back':
			SendMessage(tab.id, { cmd: 'cancel' });
			break;
		case 'entireTab':
			SendMessage(tab.id, { cmd: 'entireTab' });
			break;
		default:
			break;
	}
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