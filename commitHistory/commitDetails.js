g.application.repository.commitDetails = function () {
    //----- private variables --------

    var commmit, recosTags, fileLength, scroll_object = '';
    var PATH_RECOS, PATH_FILE,PATH_COMMIT_DETAILS,PATH_CODE_ISSUES,PATH_DESIGN_ISSUES;
    var ems = e;
    var commitDetails={}, viewData = {};
    var hm = historyManager;
    var jq = $; //use it for jquery
    var editorPanel;
    var issue_criticality_array = ['critical', 'high', 'medium', 'low', 'uncategorised', 'info'];
    var defaultLineNumber = "";


    //------------ subscribe for events on this page ----------------
    function subscribeEvents() {
        e.subscribe('OPEN_COMMIT_DETAILS', openCommitDetailsPopup);
        e.subscribe('FILE_TAB_CLICKED', reloadIssueFileData);
    }

    //----------- unsubscribe the events thet are already subscribed to avoid conflcits --------------
     function unSubscribeEvents() {
        e.unSubscribe('OPEN_COMMIT_DETAILS');
        e.unSubscribe('FILE_TAB_CLICKED');
    }

    function openCommitDetailsPopup(commitId) {
        e.popPanel();
        $('#loading_overlay,#loading_msg_container').addClass('zIndex');
        commmit = commitId;
        PATH_FILE = '/views/repositories/' + historyManager.get('currentSubSystemUid') + '/file';
        PATH_RECOS = `/api/views/repositories/${hm.get('currentSubSystemUid')}/commits/${commitId}/recos`;
        PATH_COMMIT_DETAILS = `/views/repositories/${hm.get('currentSubSystemUid')}/commits/${commitId}`;
        PATH_CODE_ISSUES = `/api/views/repositories/${hm.get('currentSubSystemUid')}/commits/${commitId}/codeissues`;
        PATH_DESIGN_ISSUES = `/api/views/repositories/${hm.get('currentSubSystemUid')}/commits/${commitId}/designissues`;
        if (commitId == undefined || commitId == null) {
            var data = {
                status: 'info',
                type: 'warning',
                is_info: false,
                message: '',
                details: i18n.t('common.info_title.oops_no_data'),
                is_add_button: false,
                button_text: '',
                is_task_management_button: false,
                task_management_text: '',
                button_event: ''
            };
            g.error_message_view(data, jq('.plugin-code-editor'));
        } else {
            ems.loadJSON(`${PATH_COMMIT_DETAILS}`, onCommitDetailsReceived, {}, true);
        }
    }
    function onCommitDetailsReceived(data, status) {
        if (status == 'success') {
            commitDetails = data;
            if (!_.isEmpty(commitDetails))
            {
                if (commitDetails.files.length) {
                    renderPluginUI();
                    let fileTabData= [];
                    let fileObj;
                    let fileStringArray=[];
                    let fileName;
                    commitDetails.files = commitDetails.files.sort( function ( a, b ) { return b.nLikelyIssues - a.nLikelyIssues; });
                    _.each(commitDetails.files, function (item, key) {
                        fileObj = item;
                        fileObj.index = key;
                        fileObj.count = 0;
                        fileStringArray = (item.path).split('/')
                        fileName = fileStringArray[fileStringArray.length - 1];
                        fileObj.fileName =  fileName
                        // .length >14 ? $.trim(fileName).substring(0, 14)+ "..." : fileName;
                        fileObj.path = item.path;
                        fileObj.nLikelyIssues = item.nLikelyIssues;
                        fileTabData.push(fileObj);
                    });

                    // new e.fileTabs({
                    //     holder: $(".diff-view-file-tabs"),
                    //     data: fileTabData,
                    //     showCount: false,
                    //     notify: {
                    //         onFileTabClick: 'FILE_TAB_CLICKED'
                    //     }
                    // });

                    g.utils.addFileTabs(fileTabData);

                    // Filetabs scrollbar
                    scroll_object = $('.tab_array').scrollTabs();

                    var file_prev = $('<div/>', { class: 'file_prev float_left' });
                    e.renderIcon(file_prev, 'previous');
                    file_prev.children().children().find('polyline').css({ 'stroke': '#7b8584', 'stroke-width': 2 });
                    $('.scroll_tab_left_button').append(file_prev);

                    var file_next = $('<div/>', { class: 'file_next float_left' });
                    e.renderIcon(file_next, 'previous');
                    file_next.children().children().attr({ 'transform': 'translate(33,32) rotate(180,0,0)' });
                    file_next.children().children().find('polyline').css({ 'stroke': '#7b8584', 'stroke-width': 2 });
                    $('.scroll_tab_right_button').append(file_next);

                    $('.file_tab').on('click', function () {
                        $('.file_tab').removeClass('fill_light');
                        $(this).addClass('fill_light');
                        $('.file_tab .issue-count').css('background', '#eee');
                        $(this).find('.issue-count').css('background', 'white');
                        var fileObject = _.findWhere(fileTabData, {fileName:  $(this).attr("data-file_name")});
                        $('.recommandation-container').remove();
                        $('.recommandation-warpper').remove();
                        reloadIssueFileData(fileObject);
                    });
                    let width = $('.commit-details-panel #popup_content').width() - ($('.code-lane-wrapper').outerWidth(true));
                    $('#diff_view').width(width);
                    $('.file_tab').first().addClass('fill_light');
                    $('.file_tab .issue-count').first().css('background', 'white');
                    reloadIssueFileData(commitDetails.files[0]);
                }
            }
            else
            {
                var data = {
                    status: 'info',
                    type: 'warning',
                    is_info: false,
                    message: '',
                    details: i18n.t('common.info_title.oops_no_data'),
                    is_add_button: false,
                    button_text: '',
                    is_task_management_button: false,
                    task_management_text: '',
                    button_event: ''
                };
                g.error_message_view(data, jq('.plugin-code-editor'));
            }
        }
    }
    function reloadIssueFileData(fileObj){
        defaultLineNumber = "";
        var requestSettings = {
            'repositoryId': hm.get('currentSubSystem'),
            'filePath': fileObj.path
        };
        getIsuuesdata(requestSettings)
        .then(issueData => {
            viewData = issueData;
            handleUiEvents();
            getFileContent(issueData.filePath);
        })
        .catch(error => {
            g.addErrorAlert(error.responseJSON);
        });
    }

    function getIsuuesdata(requestSettings) {
        return new Promise((resolve, reject) => {
            try {
                $.when(
                    $.get(`${PATH_RECOS}`, requestSettings),
                    $.get(`${PATH_CODE_ISSUES}`, requestSettings),
                    $.get(`${PATH_DESIGN_ISSUES}`, requestSettings)
                )
                .then(function (bugRecosData, codeIssuesData, designIssuesData) {
                    resolve({
                        'bugRecos': bugRecosData[0].recosData,
                        'filePath': bugRecosData[0].filePath,
                        'codeIssues': codeIssuesData[0],
                        'designIssues': designIssuesData[0]
                    })
                }, err => {
                    reject(err);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    function renderPluginUI() {
        let reviewChangesDetails = {
            fileCount: commitDetails.nfiles > 1 ? commitDetails.nfiles + " files" : commitDetails.nfiles + " file",
            newIssues: commitDetails.nLikelyIssues > 0 ? "+ "+commitDetails.nLikelyIssues : commitDetails.nLikelyIssues
        }
        $(".popup_panel_container").addClass("commit-details-panel");
        $('.commit-details-panel #popup_content').html(Template.commitDetails(reviewChangesDetails));
        var pull_request_popup_icon = $('<div/>', { class: 'pull-request-popup-icon ic-commit' });
        var code_issue_popup_title = $('<div/>', { class: 'title' });
        commitDetails.commit_hash   = (commitDetails.commit_id).substring(0, 7);
        code_issue_popup_title.append().text(commitDetails.commit_hash);
        $(".popup_panel_container").addClass("pull-request-panel");

        var desc = $('<div/>', {
            class: 'description',title:commitDetails.subject
        }).html(commitDetails.subject);
        var user_info = $('<div/>', {
            class: 'info',
        });
        var src = $('.commit-list-item[data-commitid='+commmit+']').attr('data-avatar');
        var avatar = $('<img/>', { class: 'avatar', src: src});
        commitDetails.timestampString = g.difference(Date.parse(new Date()), Date.parse(commitDetails.timestamp));
        let actorName = commitDetails.author;
        let timeDiff = commitDetails.timestampString;
        var details = $('<span/>', { class: 'details' }).text(actorName + ' ' + timeDiff);
        user_info.append(avatar, details);

        $('.popup_title_container .popup_title').append(pull_request_popup_icon, code_issue_popup_title, desc, user_info);

        // var content = $('<div/>', { class: 'header-content' });
        // $('#popup_content').append(content);
    }

    function getFileContent(filePath) {
        var requestSettings = {
            'path': filePath,
            'timestamp': new Date().getTime()
        };
        e.loadJSON(`${PATH_FILE}`, loadFileContent, requestSettings, true);
    }

    function loadFileContent(data, status) {
        if(status == 'success') {
                var modeName;
                if (commitDetails.files.length > 0) {
                    if ((commitDetails.files[0].lang).toLowerCase() == 'cpp') {
                        modeName = 'text/x-c++src';
                    } else if ((commitDetails.files[0].lang).toLowerCase() == 'c') {
                        modeName = 'text/x-csrc';
                    } else if ((commitDetails.files[0].lang).toLowerCase() == 'java') {
                        modeName = 'text/x-java';
                    } else if ((commitDetails.files[0].lang).toLowerCase() == 'c_sharp') {
                        modeName = 'text/x-csharp';
                    } else {
                        modeName = 'javascript';
                    }
                }
                // modeName = 'javascript';
                $('#code_view .CodeMirror').remove();
                var target = document.getElementById("commit_details_view");
                console.log(target);
                target.innerHTML = "";
                editorPanel = CodeMirror.fromTextArea(target, {
                    lineNumbers: true,
                    mode: modeName,
                    readOnly:true,
                    gutters: ["CodeMirror-lint-markers", "CodeMirror-linenumbers"],
                    lint: true
                });
                editorPanel.on('viewportChange', function () {
                    $('.code_tag_icon.tooltipstered').tooltipster('destroy');
                    $.each($(".CodeMirror .CodeMirror-gutter-elt .tag_icon_group .code_tag_icon"), function () {
                        $(this).attr("title", $(this).data("title"));
                    });
                    $('.code_tag_icon[title]').tooltipster();
                });
                editorPanel.execCommand('viewportChange');
                // resize code editor panel
                $(".main-panel-editor").resizable();
                resizeCodeEditor();
            }
            var fileContent = data;
            editorPanel.setValue(fileContent);
            fileLength = fileContent.split('\n').length;
            setTimeout(() => {
                plotIssuesData();
            }, 500);
    }

    function plotIssuesData() {
        var line_count = 0;
        var codeissuesTags = viewData.codeIssues;
        var designissuesTags = viewData.designIssues;
        var designissuesArr = [],codeissuesArr = [];
        recosTags = viewData.bugRecos;

        editorPanel.eachLine(function () {
            line_count++;

			var tag_icon_group = $('<div/>', { class: 'tag_icon_group' });
			for (var k1 = 0; k1 < designissuesTags.length; k1++) {
                if (designissuesTags.length > 0 && designissuesTags[k1].first_line_no == line_count) {
                    designissuesArr['obj'] = _.filter(designissuesTags, function (issues) {
                        return issues.first_line_no == line_count;
                    });
                    addTags(tag_icon_group, designissuesArr.obj.length, line_count, '', 'antipatterns', designissuesArr, designissuesTags, codeissuesTags);
                }
            }
			for (var j1 = 0; j1 < codeissuesTags.length; j1++) {
				if (codeissuesTags[j1].line_number == line_count) {
                    codeissuesArr['obj'] = _.filter(codeissuesTags, function (issues) {
                        return issues.line_number == line_count;
                    });
					addTags(tag_icon_group, codeissuesArr.obj.length, line_count, '', 'code_issues', codeissuesArr, designissuesTags, codeissuesTags);
				}
            }

            let recosData = _.filter( recosTags, {target_start: line_count });
            if(!_.isEmpty(recosData))
            {
                _.each(recosData, function(val, key){
                    if(!_.isEmpty(val.recos))
                    {
                        if(defaultLineNumber === ""){
                            defaultLineNumber = line_count;
                        }
                        addTags(tag_icon_group, val, line_count, '', 'bugs', '', '', '');
                    }
                });

            }
        });
        let bugsLane = { markers: [], name: "Bugs"};
        _.each(recosTags, function(val, key){
            if(!_.isEmpty(val.recos))
            {
                var lineNumber = val.target_start -1;
                for (let index = 0; index < val.target_length; index++) {
                    editorPanel.addLineClass(lineNumber, 'background', 'fill_22');
                    lineNumber++;
                }

                bugsLane.markers.push({
                    loc : val.target_start,
                    shape : 'diamond',
                    color : {stroke:"#D35353",fill:"#F1CBCB"},
                    label : "Bug",
                    location : val.target_start+"-"+ (parseInt(val.target_start) + parseInt(val.target_length)-1)
                })
            }
        });

        let codeIssuesLane = { markers: [], name: "Code Issues"};
        _.each(codeissuesTags, function(val, key){
            if(!_.isEmpty(val))
            {
                codeIssuesLane.markers.push({
                    loc : val.line_number,
                    shape : 'square',
                    color : {stroke:"#FF8F17",fill:"#FDE5A5"},
                    label : val.name,
                    location : val.line_number
                })
            }
        });

        let designIssuesLane = { markers: [], name: "Design Issues"};
        _.each(designissuesTags, function(val, key){
            if(!_.isEmpty(val))
            {
                designIssuesLane.markers.push({
                    loc : val.first_line_no,
                    shape : 'hexagon',
                    color : {stroke:"#A060AD",fill:"#D7AEDE"},
                    label : val.name,
                    location : val.first_line_no
                })
            }
        });
        codeLanePlot(designIssuesLane, codeIssuesLane, bugsLane,designissuesTags,codeissuesTags,recosTags);
        if(defaultLineNumber !== ""){
            setTimeout(() => {
                setEditorCursor(defaultLineNumber);
            }, 700);
        }
    }

    function codeLanePlot(designIssuesLane, codeIssuesLane, bugsLane,designissuesTags,codeissuesTags,recosTags)
    {
        var data3 = {
            total_loc: fileLength,
            lanes: [bugsLane]
        }

        $('#lane_holder').html('');
        // $('.designissue-count').prop('title',designissuesTags.length).text(designissuesTags.length);
        // $('.codeissue-count').prop('title',codeissuesTags.length).text(codeissuesTags.length);
        const dataRecos = recosTags.filter(test => test.recos.length != 0);
        $('.bugs-count').prop('title',dataRecos.length).text(dataRecos.length);
        let height = $('.commit-history-container').height() - ($('.code-count-wrapper').outerHeight(true)) - 50;
        var options = {
            zoom:{enable:false,mode:"manual",width:100,wedgeHeight:16,targetHeight:100,stroke:"rgba(74,144,226,.4)",fill:"rgba(74,144,226,.05)"},
            marker:{size:14},
            blade:{angle:"horizontal"}
        }
        var cl = new codeLane("lane_holder",200,height,data3,options);
        $('#lane_holder').height(height);
        cl.onClick(function (loc) {
            $(".CodeMirror, .diff-view-file-tabs").css("pointer-events","auto");
            $('.recommandation-container').remove();
            $('.recommandation-warpper').remove();
            setEditorCursor(loc);
        });
    }

    function setEditorCursor(lineNumber) {
        if (editorPanel !== undefined) {

            var scrollInfo = editorPanel.getScrollInfo();
            editorPanel.scrollTo(scrollInfo.left, scrollInfo.height);
            if ((lineNumber - 5) > 0) {
                editorPanel.setCursor({
                    line: (lineNumber - 5),
                    ch: 0
                });
            } else {
                editorPanel.setCursor({
                    line: 0,
                    ch: 0
                });
            }
            $('.recommandation-container').remove();
            if(lineNumber !== ""){
                $('.bug-icon[data-start-line='+ lineNumber+']').trigger('click');
            }
        }
    }

    //function to add tags to the left side of the code (antipatterns,code issues)
	function addTags(target_group, tag_name, tag_line, tag_details, tag_type, tag_json, antipatterns_tags, codeissues_tags) {
        var popoverContent = $('<div/>', { class: 'popover_content tags_details_popover tags_popover' });
		var tag_icon, float_position = 0;
		if (tag_line !== 0 && tag_line !== undefined && tag_type == 'antipatterns') {
			tag_icon = $('<div/>', { class: 'design_tag_icon tag_icon' });
			var triangle_left = $('<div/>', { class: 'triangle_left float_left' });
			var square_middle = $('<div/>', { class: 'square_middle float_left fill_antipattern text_allign_center note semibold color_base' });
			var design_issue_icon = $('<div/>', { class: 'ic-design-issues-filled' });
			var total_tag_count = $('<div/>').html(tag_name);
			square_middle.append(design_issue_icon, total_tag_count);
			var triangle_right = $('<div/>', { class: 'triangle_right float_left' });
			tag_icon.append(triangle_left, square_middle, triangle_right);
			float_position = 35;
            tag_icon.webuiPopover({
                content: popoverContent,
                placement: "auto",
                width: "400",
                trigger: 'hover',
                animation: 'pop',
                style: 'tag-icon'
            });
		} else if (tag_type == 'code_issues') {
			tag_icon = $('<div/>', { class: 'code_tag_icon tag_icon' });
			var most_critical_type = 'critical';
			var selected_obj = {};
			$.each(issue_criticality_array, function (key, item) {
				selected_obj = _.findWhere(tag_json.obj, { type: item });
				if (!_.isEmpty(selected_obj)) {
					most_critical_type = selected_obj.type;
					return false;
				}
			});
			var rounded_square = $('<div/>', {
				class: 'rounded_square float_left text_allign_center note semibold color_base'
			});

			var code_issue_icon = $('<div/>', { class: 'ic-code-quality-filled' }).css({ "color": e.gradient.getCategoryColor('gradient_rating', most_critical_type.toLowerCase()), 'font-size': '16px' });
			var total_tag_count = $('<sub/>', { class: 'code-issue-count' }).html(tag_json.obj.length).css({ "background": e.gradient.getCategoryColor('gradient_rating', most_critical_type.toLowerCase()) });
			rounded_square.append(code_issue_icon, total_tag_count);
			var triangle_right = $('<div/>', { class: 'triangle_right float_left' });
			tag_icon.append(rounded_square);
            float_position = 10;
            tag_icon.webuiPopover({
                content: popoverContent,
                placement: "auto",
                width: "400",
                trigger: 'hover',
                animation: 'pop',
                style: 'tag-icon'
            });
        } else if (tag_type === 'bugs') {
            tag_icon = $('<div/>', { class: 'tag_icon bug-icon', 'data-start-line': tag_line });
			var code_issue_icon = $('<div/>', { class: 'ic-bugs-filled' });
			tag_icon.append(code_issue_icon);
            float_position = 0;
            tag_icon.on('off').on('click', function(event){
                showRecommendations(event, tag_line);
            });
        }

        if (tag_line !== 0 && tag_line !== undefined && tag_type == 'antipatterns' && target_group.has('.design_tag_icon.tag_icon').length == 0) {
            target_group.append(tag_icon);
            editorPanel.setGutterMarker((tag_line - 1), "CodeMirror-lint-markers", target_group[0]);
            g.utils.addTagData(popoverContent, tag_json, tag_type, antipatterns_tags, codeissues_tags);

        } else if (tag_type == 'code_issues' && target_group.has('.code_tag_icon.tag_icon').length == 0) {
            target_group.append(tag_icon);
            editorPanel.setGutterMarker((tag_line - 1), "CodeMirror-lint-markers", target_group[0]);
            g.utils.addTagData(popoverContent, tag_json, tag_type, antipatterns_tags, codeissues_tags);
        }
        else if (tag_type == 'bugs' && target_group.has('.bugs_icon.tag_icon').length == 0) {
            target_group.append(tag_icon);
            editorPanel.setGutterMarker((tag_line - 1), "CodeMirror-lint-markers", target_group[0]);
        }

        tag_icon.css({
			'cursor': 'pointer',
			'right': (target_group.find('.tag_icon').length * 2) * float_position
        });
    }

    function showRecommendations(event, lineno)
    {
        $('.recommandation-warpper').remove();
        if($('.recommandation-container[data-start-line='+lineno+']').is(':visible') == true)
        {   $('.recommandation-container[data-start-line='+lineno+']').remove();

            $(".CodeMirror, .diff-view-file-tabs").css("pointer-events","auto");
            return false;
        }
        $('.recommandation-container').remove();
        let recosData = _.filter( recosTags, {target_start: lineno });
        if(!_.isEmpty(recosData))
        {
            _.each(recosData, function(val, key){
                if(!_.isEmpty(val.recos))
                {
                    let recos = val.recos;
                    var recommandation = $('<div/>', { class: 'recommandation-container', 'data-start-line': lineno});
                    $("#code_view").append(recommandation);
                    $(".CodeMirror, .diff-view-file-tabs").css("pointer-events","none");
                    $(recommandation).html(Template.recommandationPopup());
                    var leftOffset = $('.CodeMirror').width() - $('.CodeMirror-gutters').width();
                    var codeMirrorGutterSize = $('.CodeMirror-gutters').width();
                    $('.recommandation-container').css({"width":leftOffset, "margin-left":codeMirrorGutterSize});
                    $(".close-btn-wrapper .ic-close").on('click', function(){
                        $('.recommandation-container').remove();
                        $('.recommandation-warpper').remove();
                        $(".CodeMirror, .diff-view-file-tabs").css("pointer-events","auto");
                    });
                    $(".tag_icon.bug-icon").css("pointer-events","auto");

                    let counter = 0;
                    $('#bug-header .description').html('<pre>'+_.trim(_.trim(recos[counter].diff.prev_raw, '\n'),'\t')+'</pre>');
                    $('#bug-suggestions .suggestion-code').html('<pre>'+_.trim(_.trim(recos[counter].diff.curr_raw, '\n'),'\t')+'</pre>');

                    $('.suggestion-total-number').text(recos.length);
                    $('.suggestion-current-number').text(counter+1);
                    $('.commit-id-info .id').text(recos[counter].commit_id.substring(0,7));
                    $('.commit-id-info .id').prop('title',recos[counter].commit_id);
                    $('.issue-title-info .title').text(recos[counter].subject);
                    $('.issue-title-info .title').prop('title', recos[counter].subject);
                    if(recos[counter].classification){
                        for (let index = 0; index < recos[counter].classification.length; index++) {
                            if(recos[counter].classification[index] != 'unexpected')
                            {
                                var classificationDiv= $('<div/>', { class: 'classification-tag ellipsis', title:recos[counter].classification[index]}).text(recos[counter].classification[index]);
                                $('.issue-classification').append(classificationDiv);
                            }
                        }
                    }
                    if(recos[counter].issue_key != '' && recos[counter].issue_key != null)
                    {
                        $('.issue-id-info').show();
                        $('.issue-id-info .title').text('Related issue: ');
                        $('.issue-id-info .pull-request-id').text(recos[counter].issue_key);
                        $(".issue-id-info .pull-request-id").attr({"href":recos[counter].issue_link,'title':recos[counter].issue_key});
                    }
                    $(".ic-chevron-up-filled,.ic-chevron-down-filled").css('cursor', 'pointer');
                    $(".ic-chevron-down-filled").data('move', 1);
                    $(".ic-chevron-up-filled").data('move', -1);
                    $('.stepper .down').on("click", function(){
                        $('.stepper .up').removeClass('disable');
                        counter = (counter + 1) % recos.length;
                        reStepperUIRendering(counter, recos);
                        if(counter+1==recos.length){
                            $(this).addClass('disable');
                        }
                    });
                    $('.stepper .up').on("click", function(){
                        $('.stepper .down').removeClass('disable');
                        counter = (counter - 1) % recos.length;
                        reStepperUIRendering(counter, recos);
                        if(counter+1==1){
                            $(this).addClass('disable');
                        }
                    });
                    blankDiv(event, val.target_length,lineno);
                }
            });
        }
        handleUiEvents();
    }

    function blankDiv(event, lineLength,lineno){
        var recommandationWarpper = $('<div/>', { class: 'recommandation-warpper'});
        let ele = $(event.target).closest('.CodeMirror-gutter-wrapper').parent();
        var startLine = $(ele).index(); // Find index of clicked row. It requires because every lines does not appear at once.
        let endLine = parseInt(startLine) + parseInt(lineLength);
        $(".CodeMirror-code :nth-child("+endLine+")").append(recommandationWarpper);
        var x = $('.bug-icon[data-start-line='+lineno+']').offset();
        var lineHeight = lineLength * $('.CodeMirror-linebackground').parent().height();
        var topOffset = parseInt(x.top) + lineHeight - 135;
        var total = topOffset + 115 + $(".recommandation-container").height();
        if(total > $(window).height() ){
            topOffset = topOffset - ($(".recommandation-container").height() + lineHeight + 10);
        }
        $(".recommandation-container").css({top:topOffset});
        event.stopImmediatePropagation();
    }

    function reStepperUIRendering(counter, recos){
        $('.js-copy-suggestion-code').removeClass('ic-copy-filled').addClass('ic-copy').attr('title','Copy');
        $('.suggestion-current-number').text(counter+1);
        $('#bug-suggestions .suggestion-code').html('<pre>'+_.trim(_.trim(recos[counter].diff.curr_raw, '\n'),'\t')+'</pre>');
        $('#bug-header .description').html('<pre>'+_.trim(_.trim(recos[counter].diff.prev_raw, '\n'),'\t')+'</pre>');
        $('.commit-id-info .id').text(recos[counter].commit_id.substring(0,7));
        $('.commit-id-info .id').prop('title',recos[counter].commit_id);
        $('.issue-title-info .title').text(recos[counter].subject);
        $('.issue-title-info .title').prop('title', recos[counter].subject);
        $('.issue-classification').html('');
        if(recos[counter].classification){
            for (let index = 0; index < recos[counter].classification.length; index++) {
                if(recos[counter].classification[index] != 'unexpected')
                {
                    var classificationTag= $('<div/>', { class: 'classification-tag ellipsis',title:recos[counter].classification[index]}).text(recos[counter].classification[index]);
                    $('.issue-classification').append(classificationTag);
                }
            }
        }
        if(recos[counter].issue_key != '' && recos[counter].issue_key != null)
        {
            $('.issue-id-info').show();
            $('.issue-id-info .title').text('Related issue: ');
            $('.issue-id-info .pull-request-id').text(recos[counter].issue_key);
            $(".issue-id-info .pull-request-id").attr({"href":recos[counter].issue_link,'title':recos[counter].issue_key});
        }else{
            $('.issue-id-info').hide();
        }
    }

    function resizeCodeEditor()
    {
        var leftPanelWidth = $('.left-panel-editor').width();
        var rightPanelWidth = $('.right-panel-editor').css({ 'max-width': "none" }).width();
        var contentHolderWidth = $('.content_holder').width();
        var editorWidth = contentHolderWidth - rightPanelWidth - leftPanelWidth - 5;
        $(".main-panel-editor").css({ 'float': 'left' }).width(editorWidth);
        $('.main-panel-editor').resize(function () {
            $('.right-panel-editor').width(contentHolderWidth - leftPanelWidth - $(".main-panel-editor").width() - 5);
        });
        var availableHeight;
        const topMargin = 2;
        availableHeight = g.contentHeight() - jq(".panel_header").outerHeight(true) - jq(".node_summary_bar ").outerHeight(true) - topMargin;
        $('.plugin-code-editor .CodeMirror').height(availableHeight - jq('.plugin-code-editor .tab-array').outerHeight()).css("max-height", availableHeight - jq('.plugin-code-editor .tab-array').outerHeight());
        assignHeight();
    }

    function assignHeight() {
        var heightFactor = 35;
        let popupTitleContainerH = $('.popup_title_container').outerHeight(true) ;
        let commitHistoryHeaderH =  $('.commit-history-header').outerHeight(true) ;
        let fileTabContentWrapperH =  $('.file-tab-content-wrapper').outerHeight(true) ;
        var totalHeight = popupTitleContainerH+commitHistoryHeaderH+fileTabContentWrapperH;
        var height = $(window).height() - (totalHeight+heightFactor );
        $('#commit_details_view').css({ 'max-height': height, 'height': height });
        $('.commit-history-container').css({ 'max-height': height, 'height': height });
        $('.CodeMirror').css({ 'max-height': height, 'height': height });
    }

    function copyToClipboard(element) {
        var el = document.createElement('textarea');
        el.value = element;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        el.remove();
    }

    function handleUiEvents() {
        $(window).on('resize', function () {
            assignHeight();
        });

        $('.copy-code-btn-wrapper').on('click', function () {
            copyToClipboard($(this).siblings('#bug-suggestions').find('pre').text());
            $('.js-copy-suggestion-code').removeClass('ic-copy').addClass('ic-copy-filled').attr('title','Copied');
        });
    }

    //----- public functions ----------
    return {
        openCommitDetailsPopup: function (commitId) {
            unSubscribeEvents();
            openCommitDetailsPopup(commitId);
            subscribeEvents();
        }
    };
}(g);