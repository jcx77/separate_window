/**
 * Author: Belousov Alexandr
 */
if(window == top){
	chrome.runtime.onMessage.addListener(
		function(request,sender,callback){
			if(request){callback(__BgCmd.cmd(request.cmd,request.arg));}
		}
	);
	window.addEventListener('message',function(event){
		if(event){
			if(event.data.hasOwnProperty('cmd')){
				event.stopImmediatePropagation();
				CmdFromFrame.cmd(event.source,event.data.cmd);
			}
		}
	});
}

var CmdFromFrame={
	cmd:function(source,cmd){
		if(this.hasOwnProperty(cmd)){
			this[cmd]();
		}
	},
	isVideo:function(){
		EventPanel.insertBtnResize();
	},
	isModify:function(){
		EventPanel.switchBtnResize(true);
	},
	isCancel:function(){
		EventPanel.switchBtnResize(false);
	},
	clear:function(){
		EventPanel.removeBtnResize();
	},
	toggleFullScr:function(){
		var fullscr=false;
		if(document.webkitIsFullScreen){
			document.webkitCancelFullScreen();
		}else{
			fullscr=true;
			document.body.webkitRequestFullScreen();
		}
		CmdToFrame.postMessage('toogleFullScrIco',{state:fullscr});
	},
	minimizeWin:function(){
		__BgCmd.sendCmd('minimizeWin',{});
	},
	restoreWin:function(){
		__BgCmd.sendCmd('restoreWin',{});
	}
};

var CmdToFrame={
	target:undefined,
	searchInFrame:function(target){
		this.target = target.contentWindow;
		this.postMessage('searchVideo');
	},
	cancel:function(){
		this.postMessage('cancel');	
	},
	modify:function(){
		this.postMessage('modify');
	},
	postMessage:function(command,arg){
		if(this.target){
			this.target.postMessage({cmd:command,arg:arg},'*');
		}
	},
	remove:function(){
		this.postMessage('remove');
		this.target = undefined;
	}
};

var __BgCmd={
	cmd:function(cmd,arg){
		let resp=false;
		if(this.hasOwnProperty(cmd)){
			resp=this[cmd](arg);
		}
		return resp;
	},
	setItems:function(arg){
		Observer.disconnectDomChange();
		__Icons.setSelectors(arg.icons,arg.hideIcons);
		Observer.domChange();
	},
	refreshIcon:function(){
		__Element.switchOff();
		__AppPanel.responseSelectors();
	},
	hideAllIcons:function(){
		__AppPanel.dellIcon();
	},
	switchOn:function(arg){
		__Element.switchOn(Selector.getFirstVisibleElem(arg.css));
	},
	switchOff:function(){
		__Element.switchOff();
	},
	start:function(){
		__AppPanel.start();
	},
	stop:function(){
		__AppPanel.stop();
	},
	entireTab:function(){
		__AppPanel.apply(document.body);
	},
	updateEntireTab:function(){
		__AppPanel.updateTab();
	},
	saveImage:function(arg){
		let elem=document.createElement('a');
		elem.setAttribute('href',arg.data);
		elem.setAttribute('download',document.location.host.replace(/\./ig,'-'));
		elem.style.display='none';
		document.body.appendChild(elem);
		elem.click();
		document.body.removeChild(elem);
	},
	isRun:function(){
		return __AppPanel.run;
	},
	sendCmd:function(cmd,arg,callback){
		chrome.runtime.sendMessage({cmd:cmd,arg:arg}, 
			function (response){
				if(!response){callback();}
			}
		);	
	},
	isBookmark:function(arg){
		Bookmarks.isBookmark=arg;
		ButtonPanel.setBookmark(arg);
	},
	isSavedSize:function(arg){
		Modification.isSavedSize = arg;
		ButtonPanel.setSavedIcon(arg);
	},
	apply:function(arg){
		__AppPanel.apply(document.querySelector(arg));
	},
	cancel:function(){
		__AppPanel.cancel();
	},
	duplicate:function(arg){
		Duplicate.preparation(arg.selector);
	},
	modifyURL:function(){
		Selector.modifyURL(Modification.target);
	}
};