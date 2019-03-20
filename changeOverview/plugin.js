
// JavaScript Document
/*jshint sub:true*/
(function(g) {
    g.changeOverview = function() {
		// overview / changes / ratings
   		//---------------------- PRIVATE VARS ------------------
		var PATH_CHANGE_OVERVIEW = '/views/repositories/'+historyManager.get('currentSubSystemUid')+'/overview/changes';
		var PATH_RATE_DIFF = '/views/repositories/'+historyManager.get('currentSubSystemUid')+'/overview/changes/ratings';
		var PATH_COMPONENT_DATA = '/views/repositories/'+historyManager.get('currentSubSystemUid')+'/overview/changes/components';
    	var settings 				= {} ;
    	var plugin_options  		= {};
    	var hasError				= false;
    	var emulsion_plugins 		= ['dropDown'];
    	var component_data,change_overview_data,rate_diff_data;
    	var ringgraph_array 		= [];
    	//------------ PLUGIN SUBSCRIPTIONS ------------------
        e.subscribe('DROPDOWN_CLICK',onRatingSelect);
    	//--------------------- PRIVATE METHODS -----------------

    	//---------------------- INITIALIZE --------------------
		function init(holder) {
			var plugin_container = $('<div/>',{class:'plugin_container plugin_changeOverview unselectable'});
			holder.append(plugin_container);
			holder.css('overflow','auto');
			e.enablePlugin('dropDown',dropDownPluginEnabled);
			handleEvents();
		}

		function dropDownPluginEnabled() {
			getChangeOverviewData();
		}

		function clearMemory() {
			/*-------- REMOVING EVENTS ------*/
			$(window).off('resize.changeOverview');
			$(window).off('scroll.changeOverview');
			$('.change_list_btn').off('click');
			$('.list .node_details').off('click');

			e.unSubscribe('DROPDOWN_CLICK');
			/*-------- CLEARING VARIABLES ------*/
			emulsion_plugins.length = 0;
			ringgraph_array.length 	= 0;
        }

        function resizeContainers() {
		}

		$('.component_details .details_row').each(function() {
			var component_name 	= $(this).find('.changed_component_name');
			var rating_info    	= $(this).find('.rating_info');
			var loc_change 		= $(this).find('.component_loc_change');
			component_name.css('max-width',$('.component_details').width() - (rating_info.width() + loc_change.width() + 50));
		});

		//------------------- GET CHANGE OVERVIEW DATA ----------------------
		function getChangeOverviewData () {
			if(g.loadFromHistory) // if browser back button or refresh is clicked, get data from history
			{
				var currentHistoryState = g.decodeURL(window.location.hash);
                if(!($.isEmptyObject(currentHistoryState)))
                {
					settings 		= currentHistoryState.request_data;
					plugin_options 	= currentHistoryState.plugin_options;
					g.loadFromHistory = false;
				}
			}
			else // else push data to history
			{
				if(historyManager.get('currentChangeOverviewOptionList') === '')
				{
					var obj = {'selected_rating':'overallRating','selected_category':'improvement','selected_component_category':'changed_components'};
					historyManager.set('currentChangeOverviewOptionList',obj);
				}
				//these are the parameters used for client side manipulations
				plugin_options 		= historyManager.get('currentChangeOverviewOptionList');
				//these are the parameters that are sent along with request
				settings.project_id = historyManager.get('currentSubSystem');
				var history_snaps 	= historyManager.get('selectedSnapshots');
				if(history_snaps.length !== 0 )
				{
					if(history_snaps[0].id < history_snaps[1].id)
					{
						settings.snapshot_id_old = history_snaps[0].id;
						settings.snapshot_id_new = history_snaps[1].id;
					}
					else
					{
						settings.snapshot_id_old = history_snaps[1].id;
						settings.snapshot_id_new = history_snaps[0].id;
					}
				}
				g.pushHistory('change_overview','subsystems',plugin_options,settings);
			}
			e.loadJSON(PATH_CHANGE_OVERVIEW,getRateDiffData,settings,true);
		}

		//-------------------- GET RATING DATA -------------------------
    	function getRateDiffData(data,status) {
			if(status == 'success') {
				change_overview_data = data;
				if(change_overview_data.hasOwnProperty("message"))
				{
					hasError = true;
					g.sendErrorNotification(data,PATH_CHANGE_OVERVIEW,$('.plugin_changeOverview'));
				}
				else
				{
					hasError = false;
					e.loadJSON(PATH_RATE_DIFF,getChangeComponentData,settings,true);
				}
			}
			else if(status == 'error') {
				hasError = true;
				g.sendErrorNotification(data,PATH_CHANGE_OVERVIEW,$('.plugin_changeOverview'));
			}
    	}

    	function getChangeComponentData(data,status) {
    		if(status == 'success'){
				rate_diff_data = data;
				if(rate_diff_data.hasOwnProperty("message"))
				{
					hasError = true;
					g.sendErrorNotification(data,PATH_RATE_DIFF,$('.plugin_changeOverview'));
				}
				else
				{
					hasError = false;
					e.loadJSON(PATH_COMPONENT_DATA,renderer,settings,true);
				}
			}
			else if(status == 'error') {
				hasError = true;
				g.sendErrorNotification(data,PATH_RATE_DIFF,$('.plugin_changeOverview'));
			}
    	}

    	function renderer(data,status) {
    		if(status == 'success'){
    			component_data = data;
    			if(component_data.hasOwnProperty("message"))
    			{
    				hasError = true;
					g.sendErrorNotification(data,PATH_COMPONENT_DATA,$('.plugin_changeOverview'));
				}
				else
				{
					hasError = false;
						renderPluginData();
				}
			}
			else if(status == 'error') {
				hasError = true;
				g.sendErrorNotification(data,PATH_COMPONENT_DATA,$('.plugin_changeOverview'));
			}
		}

		function renderPluginData() {
			if(change_overview_data[0].project_details.rating === "" || change_overview_data[1].project_details.rating === "")
			{
				hasError = true;
				var data = {status:'info',type:'warning',is_info:false, message:i18next.t('common.info_title.oops_no_data'),details:i18next.t('common.info_description.no_content'), is_add_button:false, button_text:'',is_task_management_button:false,task_management_text:'',button_event:''};
                g.error_message_view(data,$('.plugin_changeOverview'));
				if(historyManager.get('currentBreadcrumb').id != $('#breadcrumb .header_item:last').attr('nodeid')) {
			       	e.notify(g.notifications.PLUGIN_LOADED);
				}
			}
			else if (!hasError)
			{
				renderStatistics();
				renderComponentData();
				e.notify(g.notifications.RENDERING_COMPLETE);
				if(historyManager.get('currentBreadcrumb').id != $('#breadcrumb .header_item:last').attr('nodeid')) {
					e.notify(g.notifications.PLUGIN_LOADED);
				}
			}
		}

		function renderStatistics() {
			var content_div = $('<div/>',{class:'project_land_page row'});
			$('.plugin_changeOverview').append(content_div);
			var project_description_class;
			var project_details_div_class;
			project_description_class  	= 'large-4 medium-6 small-12 columns';
			project_details_div_class  	= 'large-8 medium-6 small-12 columns';

			var project_details_div     = $('<div/>',{class:'project_details_container '+project_details_div_class});
			var project_description_div = $('<div/>',{class:'project_description_container '+project_description_class});
			content_div.append(project_description_div,project_details_div);

			var project_description = $('<div/>',{class:'project_description'});
			project_description_div.append(project_description);
			var loc_diff			= change_overview_data[1].project_details.executable_loc - change_overview_data[0].project_details.executable_loc;
			var text = '';
            var icon_name = '';
            if(loc_diff < 0)
			{
				text = ' Exec. LOC removed';
				icon_name = 'old_loc';
			}
			else if(loc_diff > 0)
			{
				text = 'New Exec. LOC added';
				icon_name = 'new_loc';
			}
			else if(loc_diff === 0) {
                text = 'LOC change';
                icon_name = 'new_loc';
			}

			var loc_change			= $('<div/>',{class:'loc_change float_left h4'});
            var loc_icon			= $('<div/>',{class:'loc_icon float_left'});
            e.renderIcon(loc_icon,icon_name);
			var loc_data			= $('<div/>',{class:'loc_data float_left ellipsis language_text'});
			var loc_value			= $('<div/>',{class:'loc_value float_left h3 bold'}).html(loc_diff);
			var loc_text			= $('<div/>',{class:'loc_text float_left language_text'}).html('&nbsp;&nbsp;'+text);
			loc_text.attr('data-language_id',text);
			loc_data.append(loc_value,loc_text);
			loc_change.append(loc_icon,loc_data);

			var dropdown_array 	= [];
			var list_array;

			if (g.isPartialLanguage()) {
				list_array = _.without((g.getParameterList()).ratings, _.findWhere((g.getParameterList()).ratings, { name: 'antiPatternRating' }));
			} else {
				list_array = (g.getParameterList()).ratings;
			}

			for(var i = 0 ; i < list_array.length ; i++)
			{
				dropdown_array.push(list_array[i].name);
			}
			var rating_change		= $('<div/>',{class:'rating_change float_left fill_light'});
			project_description.append(loc_change,rating_change);
			var dropdown_container  = $('<div/>',{class:'dropdown_container columns unselectable'}).html('');
          	rating_change.append(dropdown_container);
			var changelist_dropdown = new e.dropDown({'holder':dropdown_container,'default_selection':plugin_options.selected_rating,'dropDownLabel':'changeIn','dropDownData':dropdown_array,'multipleDropdown':false,'notify':{onDropdownItemClick:'DROPDOWN_CLICK'}});

			var health      = $('<div/>',{class:'health float_left columns'});
			rating_change.append(health);

			onRatingSelect(plugin_options.selected_rating);

			var project_details = $('<div/>',{class:'project_details fill_base'});
			project_details_div.append(project_details);

			var project_details_header = $('<div/>',{class:'project_details_header float_left'});
			var project_details_title1  = $('<div/>',{class:'project_details_title float_left fill_light stroke_right stroke_bottom stroke_light hand_cursor improvement selected'});
			project_details_title1.attr('data-text','improvement');
			var title_content1 = $('<div/>',{class:'title_content h4 color_good bold language_text'}).html('Improvements');
			project_details_title1.append(title_content1);
			var project_details_title2  = $('<div/>',{class:'project_details_title float_left fill_light stroke_bottom stroke_light hand_cursor deterioration'});
			project_details_title2.attr('data-text','deterioration');
			var title_content2 = $('<div/>',{class:'title_content h4 bold color_bad language_text'}).html('Deterioration');
			project_details_title2.append(title_content2);
			project_details_header.append(project_details_title1,project_details_title2);

			var project_details_data = $('<div/>',{class:'project_details_data float_left'});
			project_details.append(project_details_header,project_details_data);
			selectCategory(plugin_options.selected_category);
			updateProjectDetails(plugin_options.selected_category);

			$('.project_details_title').on('click',function() {
			 	plugin_options.selected_category = $(this).attr('data-text');
				historyManager.set('currentChangeOverviewOptionList',plugin_options);
				g.pushHistory('change_overview','subsystems',plugin_options,settings);
			    selectCategory($(this).attr('data-text'));
			    updateProjectDetails($(this).attr('data-text'));
		  	});
		}

		function renderComponentData() {
			var content_div = $('<div/>',{class:'project_component_page row'});
			$('.plugin_changeOverview').append(content_div);
			var component_description_class  	= 'large-4 medium-6 small-12 columns';
			var component_details_div_class  	= 'large-8 medium-6 small-12 columns';

			var component_details_div     = $('<div/>',{class:'component_details_container '+component_details_div_class});
			var component_description_div = $('<div/>',{class:'component_description_container '+component_description_class});
			content_div.append(component_description_div,component_details_div);

			var component_description = $('<div/>',{class:'component_description fill_base float_left'});
			component_description_div.append(component_description);

			var details_row, details_icon, details_text, text1, data_text;
			var component_data_array = ['changed_components','added_components','removed_components'];
			for(var i = 0 ; i < component_data_array.length ; i++)
			{
				details_row = $('<div/>',{class:'details_row tab_vertical float_left stroke_top stroke_right stroke_light hand_cursor selected '+component_data_array[i]});
			    if(i === 0) {
			    	details_row.removeClass('stroke_top');
				}
			    details_row.attr('data-text',component_data_array[i]);
			    details_icon = $('<div/>',{class:'details_icon float_left'});
			    e.renderIcon(details_icon,component_data_array[i]);
			    details_text = $('<div/>',{class:'details_text ellipsis float_left'});
			    text1 = $('<div/>',{class:'text1 float_left'});
			    details_text.append(text1);
			    if(component_data_array[i] == 'changed_components') {
			    	data_text = component_data.total_changed_components;
				}
			    else if(component_data_array[i] == 'added_components') {
			    	data_text = component_data.components_added;
				}
			    else if(component_data_array[i] == 'removed_components') {
			    	data_text = component_data.components_removed;
				}

			    data_text = '<span class="h3 bold">' + data_text + '</span>&nbsp;&nbsp;&nbsp;<span class="h4 color_dark language_text">' + g.print('change_overview.'+component_data_array[i]) + '</span>';
			    text1.html(data_text);
			    details_row.append(details_icon,details_text);
			    component_description.append(details_row);
			}
		    var component_details = $('<div/>',{class:'component_details fill_base'});
			component_details_div.append(component_details);
		    selectComponentCategory(plugin_options.selected_component_category);
		    updateComponentDetails(plugin_options.selected_component_category);
		    $('.component_description .details_row').on('click',function() {
		    	plugin_options.selected_component_category = $(this).attr('data-text');
				historyManager.set('currentChangeOverviewOptionList',plugin_options);
				g.pushHistory('change_overview','subsystems',plugin_options,settings);
				selectComponentCategory($(this).attr('data-text'));
				updateComponentDetails($(this).attr('data-text'));
		  	});
		}

		function selectCategory(class_name) {
			$('.'+class_name).removeClass('fill_light stroke_bottom').addClass('fill_base selected');
		    if(class_name == 'improvement')
		    {
		      $('.deterioration').removeClass('fill_base selected').addClass('fill_light stroke_bottom');
		    }
		    else if(class_name == 'deterioration')
		    {
		      $('.improvement').removeClass('fill_base selected').addClass('fill_light stroke_bottom');
		    }
		}

		function addRow(row,rating_name,class_name,status,data_text,info_text) {
			var icon_name = rating_name;
			if(icon_name == 'cloneRating') {
				icon_name = icon_name+'1';
			}
			e.renderIcon(row.find('.details_icon'),icon_name);
			row.attr('data-actual_name',rating_name);
			row.attr('data-status',status);
			data_text = '<span class="h3 bold color_dark">' + data_text + '</span>' + info_text;
			row.find('.text1').html(data_text);
			row.find('.text2').attr('data-language_id',rating_name).html('&nbsp;'+g.print(rating_name));
		}

		//this function is called on top tab selection (improvement/deterioration)
		function updateProjectDetails(class_name) {
			$('.project_details_data').html('');
		  	var details_row, details_icon, details_text, text1, data_text, text2,i;
		  	var hotspot_details_object = {'improvement':['hotspots_deleted','hotspots_removed','hotspots_improved'],'deterioration':['hotspots_added','hotspots_created','hotspots_deteriorated']};
		    for(i = 0 ; i < hotspot_details_object[class_name].length ; i++)
		    {
		    	if(parseInt(component_data[hotspot_details_object[class_name][i]]) !== 0)
		    	{
			    	details_row = $('<div/>',{class:'details_row float_left hand_cursor'});
					details_row.attr('data-actual_name','hotspots');
					details_row.attr('data-status',hotspot_details_object[class_name][i]);
					details_icon = $('<div/>',{class:'details_icon hotspot_icon float_left'});
					e.renderIcon(details_icon,hotspot_details_object[class_name][i]);
					details_text = $('<div/>',{class:'details_text h4 ellipsis float_left'});
					text1 		= $('<div/>',{class:'text1 float_left'});
					data_text 	= component_data[hotspot_details_object[class_name][i]];
					data_text 	= '<span class="h3 bold">' + data_text + '</span> ' + g.print('change_overview.'+hotspot_details_object[class_name][i]);
					text1.html(data_text);
					details_text.append(text1);
					details_row.append(details_icon,details_text);
					$('.project_details_data').append(details_row);
				}
			}
		    for(i = 0 ; i < rate_diff_data.categories.length ; i++)
		    {
		    	var row_value = 0;
		    	if(class_name == 'improvement') {
		    		row_value = rate_diff_data.categories[i].improved_node_count;
				}
		    	else {
		    		row_value = rate_diff_data.categories[i].deteriorated_node_count;
				}
		    	if(row_value > 0)
		    	{
			    	details_row = $('<div/>',{class:'details_row float_left hand_cursor'});
			      	details_icon = $('<div/>',{class:'details_icon float_left'});
				    details_text = $('<div/>',{class:'details_text h4 ellipsis float_left'});
				    text1 = $('<div/>',{class:'text1 float_left'});
				    text2 = $('<div/>',{class:'text2 float_left language_text'});
				    details_text.append(text1,text2);
				    details_row.append(details_icon,details_text);
			      	$('.project_details_data').append(details_row);
			      	var status = '',info_text = '';
				    if(class_name == 'improvement')
				    {
				        status = 'Improved';
				        data_text = rate_diff_data.categories[i].improved_node_count;
				        info_text = ' Component(s) improved in ';
				    }
				    else
				    {
				        status = 'Deteriorated';
				        data_text = rate_diff_data.categories[i].deteriorated_node_count;
				        info_text = ' Component(s) deteriorated in ';
				    }
				    switch(rate_diff_data.categories[i].type)
				    {
				        case 'design_issues': 	addRow(details_row,'antiPatternRating',class_name,status,data_text,info_text);
			                              		break;
			        	case 'metrics': addRow(details_row,'metricRating',class_name,status,data_text,info_text);
			                            break;
			        	case 'duplication': addRow(details_row,'cloneRating',class_name,status,data_text,info_text);
			                            	break;
			        	case 'code_quality': addRow(details_row,'codeQualityRating',class_name,status,data_text,info_text);
			                              	break;
						default : break;
			      	}
			  	}
		    }

		    if($('.project_details_data').find('.details_row').length === 0)
			{
				/* var no_data = $('<div/>',{class:'data_error h4',title:'Data Unavailable.'});
				e.renderIcon(no_data,'data_unavailable');
                $('.project_details_data').append(no_data); */
                var data = {
                    status: 'info',
                    type: 'warning',
                    is_info: false,
                    message: i18next.t('common.info_title.oops_no_data'),
                    details: i18next.t('common.info_description.no_content'),
                    is_add_button: false,
                    button_text: '',
                    is_task_management_button: false,
                    task_management_text: '',
                    button_event: ''
                };
                g.error_message_view(data, $('.project_details_data'));
			}

		    $('.project_details_data .details_row').on('click',function() {
				var rating_name 	= $(this).attr('data-actual_name');
				var rating_status 	= $(this).attr('data-status');
				var checked_params;
				var rating_id;
				if((rating_status == 'hotspots_added' || rating_status == 'hotspots_deleted') && historyManager.get('currentComponentParameterList') !== '') {
					checked_params = historyManager.get('currentComponentParameterList');
				}
	        	else if(historyManager.get('currentParameterList') !== '') {
	        		checked_params = historyManager.get('currentParameterList');
				}

	        	if(rating_name == 'hotspots') {
					rating_id = g.getParameterObjectByName('overallRating','ratings').id;
				}
				else {
					rating_id = g.getParameterObjectByName(rating_name,'ratings').id;
				}

	        	checked_params.selected 	= 'ratings';
	        	checked_params.status[0] 	= rating_status;

	        	var obj = {};
				obj[checked_params.selected] = rating_id;

				var obj1 = {};
				obj1.parameter_id = rating_id;
				obj1.sort_type    = 'diff_asc';

				if(rating_status == 'hotspots_added' || rating_status == 'hotspots_deleted')
				{
					checked_params.showAllComponents = false;
					historyManager.set('currentComponentParameterList',checked_params);
					historyManager.set('currentComponentListFilterId',obj);
					obj1.sort_type    = 'value_asc';
					historyManager.set('currentComponentParameter',obj1);
					g.setPluginHistory('component_list');
				}
				else
				{
					historyManager.set('currentParameterList',checked_params);
					historyManager.set('currentChangeListFilterId',obj);
					historyManager.set('currentChangeParameter',obj1);
					g.setPluginHistory('change_list');
				}
					e.notify(g.notifications.PLUGIN_UPDATE);
			});
		}

		function selectComponentCategory(class_name) {
			var prev_selected = $('.component_description').find('.selected');
			prev_selected.removeClass('fill_base selected').addClass('fill_light stroke_right stroke_light');
			$('.'+class_name).removeClass('fill_light stroke_right stroke_light').addClass('fill_base selected');
		}

		// this function is called on component left tab selection (added_components/removed_components/changed_components)
		function updateComponentDetails(class_name) {
			$('.component_details').attr('data-class_name',class_name).html('');
			var details_row,display_value,rating_diff_val,background_color;
			for(var i = 0 ; i < component_data[class_name][0].length ; i++)
				{
					var margin_top = '0';
					if(i === 0) {
						margin_top = '35';
					}
					details_row 	= $('<div/>',{class:'details_row float_left '}).css("margin_top",margin_top);

					background_color 	= "#48c1a3";
					if(class_name == 'changed_components')
					{
						rating_diff_val = e.math.round(component_data[class_name][0][i].new_rating - component_data[class_name][0][i].old_rating);

						if(rating_diff_val >= 0)
						{
							display_value = rating_diff_val;
						}
						else
						{
							display_value 		= e.math.round(rating_diff_val*(-1));
							background_color 	= "#f26c69";
						}
					}
					else
					{
						if(historyManager.get('currentRange') == 'range_2') {
							display_value 	= e.math.round(component_data[class_name][0][i].rating - 5);
						}
						background_color 	= e.gradient.getColor('gradient_rating',component_data[class_name][0][i].rating/10);
					}

					var rating_info		= $('<div/>',{class:'rating_info'});
					rating_info.css('background-color',background_color);
					var rating_diff 	= $('<div/>',{class:'rating_diff float_left p bold color_base'}).html(display_value);
					rating_info.append(rating_diff);
					if(class_name == 'changed_components')
					{
						var rating_arrow 	= $('<div/>',{class:'rating_arrow float_left'});
						e.renderIcon(rating_arrow,'ratingarrow');
						if(rating_diff_val < 0) {
							rating_arrow.children().children().attr({'transform':'rotate(180, 14, 24)'});
						}
						rating_arrow.find('svg polygon').attr('fill','#ffffff');
						rating_arrow.find('svg rect').attr('fill','#ffffff');
						rating_info.append(rating_arrow);
					}
					var component_icon  = $('<div/>',{class:'component_icon float_right'});
					e.renderIcon(component_icon,'class');
					component_icon.find('svg path').attr('fill','#ffffff');
					//rating_info.append(component_icon);
					var component_name	= $('<div/>',{class:'changed_component_name text_allign_left h4 float_left ellipsis',title:component_data[class_name][0][i].sig}).html(component_data[class_name][0][i].name);
					if(class_name != 'removed_components') {
						component_name.addClass('hand_cursor');
					}
					component_name.attr('data-id',component_data[class_name][0][i].id);
					component_name.attr('data-type',component_data[class_name][0][i].type);
					component_name.attr('data-name',component_data[class_name][0][i].name);
					component_name.attr('data-sig',component_data[class_name][0][i].sig);
					details_row.append(rating_info,component_name);
					if(class_name == 'changed_components')
					{
						var loc_diff			= component_data[class_name][0][i].new_loc - component_data[class_name][0][i].old_loc;
						var icon_name = '',loc_title='';
						if(loc_diff < 0)
						{
							loc_diff  	= loc_diff * (-1);
							icon_name 	= 'old_loc';
							loc_title   = ' Exec. LOC removed';
						}
						else if(loc_diff >= 0)
						{
							icon_name 	= 'new_loc';
							loc_title   = ' New Exec. LOC added';
						}

						var loc_change			= $('<div/>',{class:'component_loc_change float_left h2 color_dark fill_light',title:loc_diff+loc_title});
						var loc_icon			= $('<div/>',{class:'component_loc_icon float_left'});
						e.renderIcon(loc_icon,icon_name);
						var loc_value			= $('<div/>',{class:'component_loc_value float_left'}).html('<span class="h4 bold color_dark">'+loc_diff+'</span>');
						loc_change.append(loc_icon,loc_value);
						details_row.append(loc_change);
					}
					$('.component_details').append(details_row);
				}
				var max_width = 0;
				$('.rating_info').each(function() {
					var current_width = $(this).find('.rating_diff').outerWidth() + $(this).find('.rating_arrow').outerWidth() + $(this).find('.component_icon').outerWidth();
					if(current_width > max_width) {
						max_width = $(this).width();
					}
				});
				$('.rating_info').width(max_width+1);
				var component_count;
				if(class_name == 'changed_components') {
					component_count = component_data.total_changed_components;
				}
				else if(class_name == 'added_components') {
					component_count = component_data.components_added;
				}
				else if(class_name == 'removed_components') {
					component_count = component_data.components_removed;
				}
                if(component_count == 0)
				{
					/* var no_data = $('<div/>',{class:'data_error h4',title:'Data Unavailable.'});
				    e.renderIcon(no_data,'data_unavailable');
                    $('.component_details').append(no_data); */
                    var data = {
                        status: 'info',
                        type: 'warning',
                        is_info: false,
                        message: i18next.t('common.info_title.oops_no_data'),
                        details: i18next.t('common.info_description.no_content'),
                        is_add_button: false,
                        button_text: '',
                        is_task_management_button: false,
                        task_management_text: '',
                        button_event: ''
                    };
                    g.error_message_view(data, $('.component_details'));
				}
				else if(component_count > 5)
				{
					details_row 	= $('<div/>',{class:'details_row float_left'});
					var change_list_btn = $('<button/>',{type:'button', class:'change_list_btn button_small transition_bcolor float_right'}).html((component_count - 5)+' More');
					details_row.append(change_list_btn);
					$('.component_details').append(details_row);

					change_list_btn.on('click',function() {
						var checked_params;
						if(class_name == 'changed_components')
						{
							var rating_id = g.getParameterObjectByName('overallRating','ratings').id;
							if(historyManager.get('currentParameterList') !== '') {
				        		checked_params = historyManager.get('currentParameterList');
							}
				        	checked_params.selected 	= 'ratings';
				        	checked_params.status[0] 	= '';
				        	historyManager.set('currentParameterList',checked_params);

							var obj = {};
							obj[checked_params.selected] = rating_id;
							historyManager.set('currentChangeListFilterId',obj);

							var obj1 = {};
							obj1.parameter_id = rating_id;
							obj1.sort_type    = 'diff_asc';
							historyManager.set('currentChangeParameter',obj1);

							g.setPluginHistory('change_list');
						}
						else if(class_name == 'added_components')
						{
							if(historyManager.get('currentComponentParameterList') !== '') {
			        			checked_params = historyManager.get('currentComponentParameterList');
							}
							checked_params.status[0] 				= 'new';
					        checked_params.hotspottype 				= [''];
					        checked_params.ruletypeid 				= '';
					        checked_params.showAllComponents 		= false;
					        checked_params.showImmediateComponents 	= false;
					        checked_params.showDuplicateComponents 	= false;

					        historyManager.set('currentComponentParameterList',checked_params);
							g.setPluginHistory('component_list');
						}
						else if(class_name == 'removed_components')
						{
							if(historyManager.get('currentComponentParameterList') !== '') {
			        			checked_params = historyManager.get('currentComponentParameterList');
							}
							checked_params.status[0] 				= 'old';
					        checked_params.hotspottype 				= [''];
					        checked_params.ruletypeid 				= '';
					        checked_params.showAllComponents 		= false;
					        checked_params.showImmediateComponents 	= false;
					        checked_params.showDuplicateComponents 	= false;

					        historyManager.set('currentComponentParameterList',checked_params);
							g.setPluginHistory('component_list');
						}
						e.notify(g.notifications.PLUGIN_UPDATE);
					});
				}

				$('.changed_component_name').on('click',function() {
					if($(this).parent().parent().attr('data-class_name') != 'removed_components')
					{
		   		 		var context 		= g.getClassification($(this).attr('data-type')).toLowerCase();
		   		 		if(g.available_plugin_contexts.indexOf(context.toLowerCase()) > -1)//if(context != 'SUBCOMPONENTS')
		   		 		{
		   		 			historyManager.set('currentContext',context);
		   		 			g.setPluginHistory();
		   		 			historyManager.set('currentBreadcrumb',{ "id":$(this).attr('data-id'), "name":$(this).attr('data-name')});

							e.notify(g.notifications.PLUGIN_UPDATE);
						}
					}
	   		 	});
		}

		// this function is called on rating dropdown item selection
		function onRatingSelect(current_rating) {
			if(current_rating.selection !== undefined) {
				current_rating = current_rating.selection;
			}
			var rating_value1,rating_value2;
			$('.plugin_container .health').html('');
			var category_list_1 		= change_overview_data[0].categories;
			var category_list_2 		= change_overview_data[1].categories;
			var rating_diff_val ;
			var arrow_color     = '',fill_color='';

			function setRatingInfo(rating_1,rating_2) {
				rating_value1 = rating_1;
				rating_value2 = rating_2;
				rating_diff_val = e.math.round(rating_2 - rating_1);
			}

			if(current_rating == 'overallRating')
			{
				setRatingInfo(change_overview_data[0].project_details.rating,change_overview_data[1].project_details.rating);
			}
			else
			{
				for(var i = 0 ; i < category_list_1.length ; i++)
				{
					switch(category_list_1[i].type){
						case 'design_issues' : 	if(current_rating == 'antiPatternRating') {
													setRatingInfo(category_list_1[i].rating,category_list_2[i].rating);
												}
												break;
						case 'metrics' : if(current_rating == 'metricRating') {
											setRatingInfo(category_list_1[i].rating,category_list_2[i].rating);
											}
										break;
						case 'duplication' : if(current_rating == 'cloneRating') {
											 	setRatingInfo(category_list_1[i].rating,category_list_2[i].rating);
											}
											break;
						case 'code_issues' : if(current_rating == 'codeQualityRating') {
											 	setRatingInfo(category_list_1[i].rating,category_list_2[i].rating);
											}
											 break;
						default : break;
					}
				}
			}
			var health_1 	= $('<div/>',{class:'h2 bold health_graph range_change float_left'}).html(g.formatRating(rating_value1));
			health_1.css('border-color',e.gradient.getColor('gradient_rating',rating_value1/10));
			health_1.attr('data-rating_value',rating_value1);

			var health_2 	= $('<div/>',{class:'h2 bold health_graph range_change float_right'}).html(g.formatRating(rating_value2));
			health_2.css('border-color',e.gradient.getColor('gradient_rating',rating_value2/10));
			health_2.attr('data-rating_value',rating_value2);

			if (rating_diff_val >= 0)
			{
				arrow_color = 'green';
				fill_color 	= 'fill_good';
			}
			else
			{
				arrow_color = ' red';
				fill_color 	= 'fill_bad';
			}
			var health_diff     = $('<div/>',{class:'health_diff float_left'});
			var health_diff_val = $('<div/>',{class:'box_1 h4 color_base text_allign_center '+fill_color}).html(e.format.numberFormat(e.format.signedInt(rating_diff_val)));
			var arrow_left  	= $('<div/>',{class:'arrow_left '+arrow_color});
			e.renderIcon(arrow_left, 'longarrow');
			arrow_left.find('svg#longarrow').attr('width','80%');
			arrow_left.children().children().attr({'transform':'rotate(270, 50, 50)'});
			health_diff.append(health_diff_val,arrow_left);
			$('.plugin_container .health').append(health_1,health_diff,health_2);
		}

		function handleEvents() {
			$( window ).on('resize.changeOverview',function() {
				if(!hasError) {
					resizeContainers();
				}
			});
		}

	//---------- PUBLIC METHODS ------------
		return {
				initPlugin:function(holder) {
					init(holder);
				},
				clearMemory:function() {
					clearMemory();
				},
				resizeContainers:function() {
					resizeContainers();
				}
			};
    };
    return g;
})(g);