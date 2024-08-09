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
