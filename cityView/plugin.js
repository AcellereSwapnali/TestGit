
// JavaScript Document
(function(g) {
    g.cityView = function() {
   
   		//------------------ PRIVATE VARS ---------------------
    	var PATH_CITYVIEW 		='/gamma/api/cityview/getcityview';
		var hasError			= false;
		var settings  			= {};
        var plugin_options  	= {};
		var isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
		var isFF = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
		var panel_holder,params={},obj_cityView;


		//----------------PRIVATE METHODS -----------------------

		//---------------- INITIALIZE PLUGIN-----------------
		function init(holder) {
			panel_holder = holder;			
			e.activateModule('swfobject',onModuleActivated);
		}
		function pluginNotAvailable(holder){
			var error_str="Please install or upgrade flash player";
			var plugin_container_error_msg = $('<div/>',{class:'p color_bad plugin_not_available_error'}).html(error_str).show();
			holder.append(plugin_container_error_msg);
		}

		function onModuleActivated()
		{	
			if(g.loadFromHistory)
				g.loadFromHistory = false;
			
			else
			{
				g.pushHistory('city_view',historyManager.get('currentContext'),plugin_options,settings);
			}
			if (true)
			{
				settings = {project_id:historyManager.get('currentSubSystem')};
				if(historyManager.get('selectedSnapshots').length !== 0 )
					settings.snapshot_id = historyManager.get('selectedSnapshots')[0].id;

				var plugin_container = $('<div/>',{class:'plugin_container plugin_container_cityView'}).html('');
				var plugin_cityView = $('<div/>',{class:'plugin_cityView'});
				plugin_container.append(plugin_cityView);
				plugin_cityView.attr('id', 'swf_holder');
				panel_holder.append(plugin_container);
				panel_holder.css('overflow','auto');
				var flashvars = {
								path: g.DOMAIN_NAME+PATH_CITYVIEW+'?snapshot_id='+settings.snapshot_id+'&project_id='+settings.project_id,
							    project_id: settings.project_id,
							    snapshot_id: settings.snapshot_id
								};
				params = {wmode:"direct",allowScriptAccess:"sameDomain",allowFullscreen:"true"};
				swfobject.embedSWF("main.swf", "swf_holder", '100%', '100%', "12",false,flashvars,params,false,swfReady);
				//e.notify(g.notifications.RENDERING_COMPLETE);
			}
			else
			{	
				var margin_top = ($(window).height()/2) - 54;
				var message = $('<div/>',{class:'e_message'}).html('City View is not supported on your browser!</br>Please try in Chrome or Firefox.');
				message.css('margin-top',margin_top+'px');
				$("#content").append(message);
				e.notify("RENDERING_COMPLETE");
			}
		}

		function swfReady(evt) {
			console.log('this is test..');
			setTimeout(function() {
				var src= g.DOMAIN_NAME + '/gamma/api/cityview/getcityview';
				if(e.request_register.indexOf(src) != -1)
				{
					e.request_register.splice(e.request_register.indexOf(src),1);
					e.notify(e.notifications.DATA_LOADED);
				}
			},2500);
		}	

		function clearMemory() { 
			/*-------- REMOVING EVENTS ------*/
			

			/*-------- REMOVING EMULSION DEPENDNCIES ------*/
			e.deActivateModule(['js/external/swfobject.js']);

			/*-------- CLEARING VARIABLES ------*/
			PATH_CITYVIEW=null;hasError=null;settings=null;plugin_options=null;isChrome=null;isFF=null;panel_holder=null;
            
            /*-------- REMOVING GAMMA DEPENDENCIES ------*/
           	obj_cityView = null;
	        g.disablePlugin('cityView');
        }

        function initCityView(holder) {
        	var hasFlash = false;
			try 
			{
			    hasFlash = Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'));
			}
			catch(exception) 
			{
			    hasFlash = ('undefined' != typeof navigator.mimeTypes['application/x-shockwave-flash']);		    
			}
			if(!hasFlash)
			{
			  	e.notify(g.notifications.RENDERING_COMPLETE);
				pluginNotAvailable(holder);
			}
			else
			{
				e.request_register.push(g.DOMAIN_NAME + '/gamma/api/cityview/getcityview');	
				e.notify(e.notifications.DATA_REQUESTED);
				init(holder);
			}
        }

	//---------- PUBLIC METHODS ------------
		return {
				initPlugin:function(holder) {
					initCityView(holder);
				},
				clearMemory:function() {
					clearMemory();
				}
			};
    };
    return g;
})(g);