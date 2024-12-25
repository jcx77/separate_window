/**
 * Author: Belousov Alexandr
 */
var i18 = chrome.i18n.getMessage;
var Tabs = chrome.tabs;
import { Storage } from './storage.js';

var popup_Panel = {
    cfg: {
        isDuplicate: false,
        isCopy: false,
        isFocus: true,
        position: { left: 0, top: 0, auto: 1 },
        size: { width: 'Auto', height: 'Auto' },
        showAdvSettings: false,
        hideAllIcon: false
    }
};

var PopUp = {
    _forEmptyTab: function () {
        chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
            if (tab[0].url.indexOf('chrome://newtab/') === 0) {
                document.querySelectorAll('.wrap-buttons').forEach(function (elem) {
                    elem.style.display = 'none';
                });
                document.getElementById('advCfg').style.maxHeight = '550px';
            } else {
                this.sendCommand({cmd: 'isRun'}, function (response) {
                    if (response === 'err') {
                        document.getElementById('error').style.display = 'block';
                        document.getElementById('main').style.display = 'none';
                    } else {
                        document.getElementById('select').checked = response;
                    }
                });
            }
        }.bind(this));
    },

    _loadSettings: function () {
        this._forEmptyTab();
        // console.log(Panel.cfg);
        // let cfg = Panel.cfg;
        // document.getElementById('duplicate').checked = cfg.isDuplicate;
        // document.getElementById('isCopy').checked = cfg.isCopy;
        // document.getElementById('focus').checked = !cfg.isFocus; // !cfg.isFocus as per your original logic
        // document.getElementById('hideAllIcon').checked = cfg.hideAllIcon;
        // document.getElementById('advSettings').checked = cfg.showAdvSettings;
        //
        // let pos = cfg.position;
        // let size = cfg.size;
        // document.getElementById('width').value = size.width || 'Auto';
        // document.getElementById('height').value = size.height || 'Auto';
        //
        // // Position handling
        // if (pos.auto) {
        //     document.getElementById('auto').checked = true;
        // } else {
        //     if (pos.left) {
        //         pos.top ? document.getElementById('lftop').checked = true :
        //             document.getElementById('lfbottom').checked = true;
        //     } else {
        //         pos.top ? document.getElementById('rgtop').checked = true :
        //             document.getElementById('rgbottom').checked = true;
        //     }
        // }
        // PopUp.toggleAdvSettings();
        // PopUp.toggleDupCfg();



        chrome.runtime.sendMessage({cmd: 'getPanelConfig'}, function (response) {
            console.log('获取到的设置信息为：', response);
            if (!response.panel) {
                console.error('Panel not found');
                return;
            }
            let cfg = response.panel.cfg;
            popup_Panel.cfg = response.panel.cfg
            document.getElementById('duplicate').checked = cfg.isDuplicate;
            document.getElementById('isCopy').checked = cfg.isCopy;
            document.getElementById('focus').checked = !cfg.isFocus; // !cfg.isFocus as per your original logic
            document.getElementById('hideAllIcon').checked = cfg.hideAllIcon;
            document.getElementById('advSettings').checked = cfg.showAdvSettings;

            let pos = cfg.position;
            let size = cfg.size;
            document.getElementById('width').value = size.width || 'Auto';
            document.getElementById('height').value = size.height || 'Auto';

            // Position handling
            if (pos.auto) {
                document.getElementById('auto').checked = true;
            } else {
                if (pos.left) {
                    pos.top ? document.getElementById('lftop').checked = true :
                        document.getElementById('lfbottom').checked = true;
                } else {
                    pos.top ? document.getElementById('rgtop').checked = true :
                        document.getElementById('rgbottom').checked = true;
                }
            }

            PopUp.toggleAdvSettings();
            PopUp.toggleDupCfg();
        });


    },

    _localization: function () {
        let elems = document.querySelectorAll('*[data-i18n]');
        for (let elem of elems) {
            if (elem.classList.contains('switch-inner') || elem.classList.contains('button')) {
                elem.setAttribute('data-on', i18(elem.getAttribute('data-i18n') + 'On'));
                elem.setAttribute('data-off', i18(elem.getAttribute('data-i18n') + 'Off'));
            } else if (elem.classList.contains('mark')) {
                elem.setAttribute('title', i18(elem.getAttribute('data-i18n')));
            } else {
                elem.innerHTML = i18(elem.getAttribute('data-i18n'));
            }
        }
    },

    _onClick: function (e) {
        switch (e.target.id) {
            case 'select':
                this.onSelect();
                break;
            case 'popTab':
                this.onPopTab();
                break;
            case 'advSettings':
                this.toggleAdvSettings();
            case 'duplicate':
                this.toggleDupCfg();
            case 'isCopy':
            case 'focus':
            case 'hideAllIcon':
            case 'width':
            case 'height':
                this.saveSettings();
                break;
            default:
                break;
        }

        switch (e.target.className) {
            case 'name':
                this.onButtons(e.target);
                break;
            case 'delete':
                this.onDelete(e.target);
                break;
            case 'showIcon':
                this.onCheckIcons(e.target);
                break;
            case 'switch-position':
                this.saveSettings();
                break;
            default:
                break;
        }
    },

    _formHistory: function () {
        this.getTab(function (tab) {
            let last = document.getElementById('last'),
                history = document.getElementById('history');


            Storage.getItems(tab.url, function (itemObj) {
                if (itemObj) {
                    let items = itemObj;
                    history.style.display = 'block';
                    last.innerHTML = '';
                    for (let i = 0, len = items.css.length; i < len; ++i) {
                        let name = items.name[i];
                        let checked = '';
                        if (items.icon[i] == true) checked = 'checked';
                        if (name == '') name = 'Area #' + (i + 1);
                        last.innerHTML += '<div id="' + i + '" class="buttons" data-index="' + i + '">' +
                            '<div class="name" data-index="' + i + '">' + name + '</div>' +
                            '<div class="edit">' +
                            '<div class="wrap_icons"><input id="icon_' + i + '" class="showIcon" data-index="' + i + '" type="checkbox" ' + checked + '><label for="icon_' + i + '" class="icons" title="' + i18('showIcon') + '"></label></div>' +
                            '<div class="wrap_del"><button id="edit_' + i + '" class="delete" data-index="' + i + '" title="' + i18('delete') + '"></button></div>' +
                            '</div>' +
                            '</div>';
                    }
                    document.querySelectorAll('.buttons').forEach(
                        function (button) {
                            button.addEventListener('mouseenter', this.switchOn.bind(PopUp));
                            button.addEventListener('mouseleave', this.switchOff.bind(PopUp));
                        }, PopUp);
                } else {
                    history.style.display = 'none';
                    last.innerHTML = '';
                }
            });

        });
    },

    onCheckIcons: function (target) {
        let index = target.getAttribute('data-index');
        let prop = {name: 'icon', value: target.checked};
        this.getTab(function (tab) {
            Storage.saveProp(tab.url, index, prop);
            Tabs.sendMessage(tab.id, {cmd: 'refreshIcon', arg: {}}, function (response) {
            });
        });
    },

    onButtons: function (target) {
        let index = target.getAttribute('data-index');
        this.getTab(function (tab) {
            cmdFromTab.fromHistory(index, tab);
        });
    },

    onDelete: function (target) {
        let index = target.getAttribute('data-index');
        this.getTab(function (tab) {
            Storage.delItem(tab.url, index, function () {
                PopUp._formHistory();
                Tabs.sendMessage(tab.id, { cmd: 'refreshIcon', arg: {} }, function (response) { });
            });
        });
    },

    onPopTab: function () {
        this.sendCommand({cmd: 'entireTab'}, function (answer) {
            if (answer) window.close();
        });
    },

    onSelect: function () {
        if (document.getElementById('select').checked) {
            this.sendCommand({cmd: 'start'}, function (answer) {
                window.close();
            });
        } else {
            this.sendCommand({cmd: 'stop'}, function (response) {
            });
        }
    },

    switchOn: function (e) {
        let index = e.target.getAttribute('data-index');
        this.getTab(function (tab) {
            Storage.getItem(tab.url, index, function (item) {
                Tabs.sendMessage(tab.id, { cmd: 'switchOn', arg: { css: item.selector } });
            });
        });
    },

    switchOff: function () {
        this.sendCommand({cmd: 'switchOff', arg: {}}, function (response) {
        });
    },

    saveSettings: function () {
        console.log('saveSettings');
        console.log(popup_Panel);
        console.log(document.getElementById('duplicate').checked);
        popup_Panel.cfg.isDuplicate = document.getElementById('duplicate').checked;
        popup_Panel.cfg.isCopy = document.getElementById('isCopy').checked;
        popup_Panel.cfg.isFocus = !document.getElementById('focus').checked;
        popup_Panel.cfg.hideAllIcon = document.getElementById('hideAllIcon').checked;
        popup_Panel.cfg.size.width = document.getElementById('width').value;
        popup_Panel.cfg.size.height = document.getElementById('height').value;
        popup_Panel.cfg.showAdvSettings = document.getElementById('advSettings').checked;
        let pos = { left: 0, top: 0, auto: 0 };
        if (document.getElementById('auto').checked) {
            pos.auto = 1;
        } else {
            if (document.getElementById('lftop').checked || document.getElementById('rgtop').checked) {
                pos.top = 1;
            }
            if (document.getElementById('lftop').checked || document.getElementById('lfbottom').checked) {
                pos.left = 1;
            }
        }
        if (popup_Panel.cfg.hideAllIcon) {
            this.sendCommand({ cmd: 'hideAllIcons', arg: {} },function(response){});
        } else {
            this.sendCommand({ cmd: 'refreshIcon', arg: {} },function(response){});
        }
        popup_Panel.cfg.position = pos;
        console.log(popup_Panel.cfg);
        //Panel.saveSetting();

        chrome.runtime.sendMessage({cmd: 'savePanelConfig',arg:popup_Panel}, function (response) {
            // console.log('tab.id', tab.id);
            console.log('获取到的设置信息为：', response);

        });


/*        let cfg = {};
        cfg.isDuplicate = document.getElementById('duplicate').checked;
        cfg.isCopy = document.getElementById('isCopy').checked;
        cfg.isFocus = !document.getElementById('focus').checked;  // Inverted logic
        cfg.hideAllIcon = document.getElementById('hideAllIcon').checked;
        cfg.size = {
            width: document.getElementById('width').value,
            height: document.getElementById('height').value
        };
        cfg.showAdvSettings = document.getElementById('advSettings').checked;

        let pos = {left: 0, top: 0, auto: 0};
        if (document.getElementById('auto').checked) {
            pos.auto = 1;
        } else {
            if (document.getElementById('lftop').checked || document.getElementById('rgtop').checked) {
                pos.top = 1;
            }
            if (document.getElementById('lftop').checked || document.getElementById('lfbottom').checked) {
                pos.left = 1;
            }
        }
        cfg.position = pos;
        Panel.saveSetting(cfg);

        if (cfg.hideAllIcon) {
            this.sendCommand({cmd: 'hideAllIcons', arg: {}}, function (response) {
            });
        } else {
            this.sendCommand({cmd: 'refreshIcon', arg: {}}, function (response) {
            });
        }*/
    },

    toggleAdvSettings: function () {
        if (document.getElementById('advSettings').checked) {
            document.getElementById('advCfg').style.maxHeight = '550px';
        } else {
            document.getElementById('advCfg').style.maxHeight = '0';
        }
    },

    toggleDupCfg: function () {
        if (document.getElementById('duplicate').checked) {
            document.getElementById('restTab').style.display = 'block';
        } else {
            document.getElementById('restTab').style.display = 'none';
        }
    },

    init: function () {
        this._loadSettings();
        this._localization();
        this._formHistory();
        document.body.addEventListener('click', this._onClick.bind(PopUp));
    },

    getTab: function (callback) {
        Tabs.query({active: true, currentWindow: true}, function (tabs) {
            callback(tabs[0]);
        });
    },

    sendCommand: function (command, callback) {
        this.getTab(function (tab) {
            Tabs.sendMessage(tab.id, command, function (response) {
                if (typeof (response) === 'undefined') {
                    callback('err');
                } else {
                    callback(response);
                }
            });
        });
    }
};

window.onload = function () {
    PopUp.init();
};
