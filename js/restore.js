// restore.js - 还原 removeChild 并清理被阻止移除的元素
(function() {
	Element.prototype.removeChild = Element.prototype.swRemCh;
	if (document.hasOwnProperty("swRemoval")) {
		for (var i = 0, len = document.swRemoval.length; i < len; i++) {
			document.swRemoval[i].parentNode.removeChild(document.swRemoval[i]);
		}
		delete document["swRemoval"];
		delete document["swRemCh"];
	}
})();