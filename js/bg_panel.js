
export var Panel = {
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
		chrome.tabs.move(tabId, { windowId: winId, index: index }, function (tab) {
			if (!chrome.runtime.lastError) chrome.tabs.update(tab.id, { active: true });
		});
	},
	createPop: function (tabId, size, windowSize) {
		chrome.tabs.get(tabId, function (tab) {
			if (this.cfg.isDuplicate) {
				chrome.windows.getCurrent(function (win) {
					if (win.type == 'normal' && tab.url.indexOf('#sepwin') == -1) {
						chrome.tabs.duplicate(tabId, function (dupTab) {
							newTabs.addDupId(tabId, dupTab.id);
						});
					}
				});
			}
			chrome.windows.get(tab.windowId, {}, function (window) {
				if (window.type !== 'popup') {
					chrome.tabs.query({ windowId: window.id }, function (arrTab) {
						if (arrTab.length == 1) {
							chrome.windows.create({
								top: 		window.top,
								left: 		window.left,
								width: 		window.width,
								height: 	window.height,
								focused: 	!Panel.cfg.isFocus,
								incognito: 	window.incognito
							});
						}
					});
					let left = null,
						top = null,
						position = Panel.cfg.position,
						width = size.width > 150 ? size.width : 150,
						height = size.height > 150 ? size.height : 150,
						aspect = width / height;

					if (Panel.cfg.size.width !== 'Auto') {
						width = Math.round(Panel.cfg.size.width);
						if (Panel.cfg.size.height == 'Auto' && !size.entireTab) {
							height = Math.round(width / aspect);
						}
					}
					if (Panel.cfg.size.height !== 'Auto') {
						height = Math.round(Panel.cfg.size.height);
						if (Panel.cfg.size.width == 'Auto' && !size.entireTab) {
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
					if(windowSize){
						left = windowSize.left;
						top	= windowSize.top;
						width = windowSize.width;
						height = windowSize.height;
					}
					chrome.windows.create({
						left: left,
						top: top,
						tabId: tabId,
						width: width,
						height: height,
						focused: Panel.cfg.isFocus,
						type: 'popup',
						incognito: window.incognito
					},
					function (window) {
						newTabs.addNewWinId(tabId, window.id);
						SendMessage(tabId, { cmd: 'modifyURL', arg: false });
					});
				}
			});
		}.bind(this));
	},
	checkTab: function (tab) {
			chrome.windows.get(tab.windowId, {}, function (window) {
				if (window.type == 'popup') {
					Panel.restoreTab(tab, false);
				}
			});
	},
	restoreTab: function (tab, unload) {
		unload = unload || false;
		let incognito = tab.incognito;
		let index = newTabs.find(tab.id);
		let prop = {
			tabId: tab.id,
			winId: -1,
		};
		if (index > -1) {
			prop = newTabs.get(tab.id);
		}
		chrome.windows.get(prop.winId, function (window) {
			if (!chrome.runtime.lastError && window) {
				if (Panel.cfg.isDuplicate && !Panel.cfg.isCopy && !unload) {
					chrome.tabs.get(prop.dupId, function (dupTab) {
						var pos = -1;
						if (!chrome.runtime.lastError) {
							pos = dupTab.index;
							chrome.tabs.remove(prop.dupId);
						}
						Panel._moveTab(prop.tabId, window.id, pos);
					});
				} else {
					Panel._moveTab(prop.tabId, window.id, -1);
				}
			} else {
				chrome.windows.getAll({ windowTypes: ['normal'] }, function (allWin) {
					let winId=-1;

					for(var i=0;i<allWin.length;i++) {
						if(allWin[i].incognito==incognito){
							winId=allWin[i].id;
							break;
						}
					};

					if (winId>-1){
						Panel._moveTab(prop.tabId, winId, -1);
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
	updateWin:function(winId,state){
		chrome.windows.update(winId, state, function (){});
	},
	saveSetting: function () {
		Storage.saveSetting({ cfg: this.cfg });
	},
	setSettings: function (items) {
		if (items.hasOwnProperty('cfg')) {
			for (var item in items.cfg) {
				if (this.cfg.hasOwnProperty(item)) this.cfg[item] = items.cfg[item];
			}
		}
	}
};


// 监听来自其他脚本的消息
chrome.runtime.onMessage.addListener((request, sender, callback) => {
	// console.log("request"+request);
	// console.log("sender"+sender);
	if (request && sender && request.cmd) {
		if (request.cmd === 'getPanelConfig') {
			// 当收到请求时返回 Panel 配置
			callback({ panel: Panel });
			console.log("Panel"+Panel);
		}

	}
});