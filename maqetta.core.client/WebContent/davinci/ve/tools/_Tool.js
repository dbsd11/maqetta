define(["dojo/_base/declare",
        "davinci/ve/widget",
        "davinci/ve/metadata"], function(declare, widget, metadata){

return declare("davinci.ve.tools._Tool", null, {

	_getTarget: function(){
		return this._target;
	},

	_setTarget: function(target){
		
		if(!this._targetOverlays){
			this._targetOverlays = [];
		}

		if(this._matchesTargetOverlay(target)){
			return;
		}

		var containerNode = this._context.getContainerNode();
		var w;
		
		while(target && target != containerNode){
			w = widget.getEnclosingWidget(target);
			// Not sure when w.getContext() won't be true. Maybe that check deals with
			// widgets that are either not completely ready or in process of being deleted?
			// If anyone knows answer, please update this comment.
			if(w && !w.getContext()){
				target = w.domNode.parentNode;
				w = null;
			}else if (w && davinci.ve.metadata.queryDescriptor(w.type, "enablePointerEvents")) {
				// By default, this function posts an overlay DIV over primitive widgets to mask/capture 
				// mouse/touch/pointer events  that might otherwise trigger a widget's own interactive logic, 
				// such as bringing up popup menus or onhover styling.
				// The "enablePointerEvents" descriptor property says don't mask/capture these events
				// and let those events go right through into the underlying widget.
				w = null;
				break;
			}else{
				// Flow typically comes to here. The following check determines if
				// current widget is a container, which means it can contain other widgets.
				// If a container, then don't put editFeedback overlay over this DOM node
				// because we want user to be able to click-select on child widgets,
				// (unless the "isControl" metadata override is set for this widget type).
				if (w && w.getContainerNode()) {
					// Some Dijit widgets inherit from dijit._Container even those
					// they aren't really meant to contain child widgets.
					// "isControl" metadata flag overrides and says this is really 
					// a primitive widget not a container widget.
					if (!davinci.ve.metadata.queryDescriptor(w.type, "isControl")) {
						w = null;
					}
				}
				break;
			}
		}

		if(w){
			//target is what we calculated for "w"
			this._target = w;
			
			//Deal with the style node
			var node = w.getStyleNode();
			var box = this._context.getDojo().position(node, true);
			box.l = box.x;
			box.t = box.y;
			
			//Change the dimensions of the overlay region based on the target
			this._updateTargetOverlays();

			//Insert overlay element(s)
			this._insertTargetOverlays();
		}else{
			//No target, so remove the overlay region(s)
			this._removeTargetOverlays();
			this._target = null;
		}
	},
	
	// Calculate bounds for "target" overlay rectangle(s)
	_updateTargetOverlays: function(){
		//Let's clear out overlay regions array
		this._removeTargetOverlays();
		
		var domNode = this._target.domNode;
		var maxZIndex = this._getMaxZIndex(domNode);
		if(this._targetOverlays && this._target){
			
			//See if helper wants to tell us what to use for target overlays
			var helper = this._target.getHelper();
			if(helper && helper.getTargetOverlays) {
				var customTargetOverlays = helper.getTargetOverlays(this._target);
				if (customTargetOverlays && customTargetOverlays.length > 0) {
					dojo.forEach(customTargetOverlays, function(customOverlay) {
						//Create a new overlay div and set up according to dimensions
						//from the helper
						var overlay =
								this._getNewTargetOverlay(customOverlay,
										customOverlay.x, customOverlay.y,
										customOverlay.width, customOverlay.height,
										maxZIndex);
	
						//Add new overlay div to our overall list
						this._targetOverlays.push(overlay);
		            }, this);
					
					
					//We're done here
					return;
				}
			} 
			
			//No special overlay regions, so let's just do the normal thing and calculate
			//overlay region dimensions ourselves
			var overlay =
					this._getNewTargetOverlay(domNode, domNode.offsetLeft,
							domNode.offsetTop, domNode.offsetWidth,
							domNode.offsetHeight, maxZIndex);	

			//Add new overlay div to our overall list
			this._targetOverlays.push(overlay);
		}
	},

	//Calculate zIndex -- we want a zIndex at least equal to the maximum
	//zIndex of domNode and it's descendants. This comes into play
	//with HorizontalSlider/VerticalSlider where the progress bar and the 
	//knob on the progress bar have higher zIndex values than the slider
	//itself.
	_getMaxZIndex: function(startNode) {
		//We want to look at the computed zIndex of the startNode and all
		//descendant's of startNode to find the maximum zIndex value
		var max_zIndexStr = dojo.style(startNode, "zIndex");
		dojo.query("*", startNode).forEach(function(node){
			var node_zIndexStr = dojo.style(node, "zIndex");
			var node_zIndexNumber = Number(node_zIndexStr);
			var max_zIndexNumber = Number(max_zIndexStr);
			if (!isNaN(node_zIndexNumber)) {
				//Our node's zIndex maps to a valid number
				if (isNaN(max_zIndexNumber)) {
					//Our max is not a valid number, so replace it
					max_zIndexStr = node_zIndexStr;
				} else if (node_zIndexNumber > max_zIndexNumber) {
					//Both our node and max zIndices map to valid numbers,
					//so replace max with node zIndex if greater
					max_zIndexStr = node_zIndexStr;
				}
			}
			//We don't care about the else case (where node's zIndex does not represent a number)
		});

		return max_zIndexStr;
	},
	
	_getNewTargetOverlay: function(domNode, x, y, width, height, zIndex) {
		var overlay = this._context.getDojo().create("div", {
			className: "editFeedback",
			style: {
				position: "absolute",
				opacity: 0.1,
				left: x + "px",
				top: y + "px",
				width: width + "px",
				height: height + "px",
				zIndex: zIndex
			}
		});
		return overlay;
	},
	
	_insertTargetOverlays: function() {
		if (this._targetOverlays && this._target) {
			var domNode = this._target.domNode;
			var parentNode = domNode.parentNode;
			dojo.forEach(this._targetOverlays, function(overlay) {
				parentNode.insertBefore(overlay, domNode.nextSibling);
            }, this);
		}
	},
	
	_removeTargetOverlays: function() {
		if (this._targetOverlays && this._target) {
			//Need to go in reverse order so pop removes right item from array
			for (var i = this._targetOverlays.length - 1; i >= 0; i--) {
				var overlay = this._targetOverlays[i];
				dojo.destroy(overlay);
				this._targetOverlays.pop();
            }
		}
	},
	

	_matchesTargetOverlay: function(target) {
		return dojo.some(this._targetOverlays, function(entry) {
			return target == entry;
		}, this);
	}
});
});