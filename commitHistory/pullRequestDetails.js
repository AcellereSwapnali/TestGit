g.application.repository.pullRequest = function () {
    //----- private variables --------

    var PATH_ACTIVELANGUAGE = '/views/repositories/';
    var firstFile, secondFile;
    var currentLanguage;
    var PATH_PULL_REQUEST, getFileUrl;
    var codeIssuePopupObj = null, codeIssues, designIssues, bugs;
    var path = '/api/v1/repositories/codecheckers/';
    let prPrimaryData;
    var fixedIssueCheck = true, newIssueCheck = true, carriedIssueCheck = true;
    let firstBaseDir = '', secondBaseDir = '';
    var scroll_object;
    var codeEditorObj;
    var inlineDiffStatus = true;
    var textColorCode = {
        critical : "#DFB0B0",
        high : "#FFB9B9",
        medium : "#FBE2C0",
        low : "#F8EDC7"
    }
    
    //----------- unsubscribe the events thet are already subscribed to avoid conflcits --------------
    function subscribeEvents() {
        e.subscribe('OPEN_RULES_CONFIG1', openCodeHistoryPopup);
        e.subscribe('FILE_TAB_CLICKED', loadFile);
    }

    //------------ subscribe for events on this page ----------------
    function unSubscribeEvents() {
        e.unSubscribe('OPEN_RULES_CONFIG1');
        e.unSubscribe('FILE_TAB_CLICKED');
    }

    function openCodeHistoryPopup(prId) {
        inlineDiffStatus = true;
        $(document).off("click", '.webui-popover-content .tags_details_popover.tags_popover .code-issues_popup');
        e.popPanel();
        let settings = { repositoryId: historyManager.get('currentSubSystem') };
        PATH_PULL_REQUEST = `/views/repositories/${historyManager.get('currentSubSystemUid')}/pullrequests/`;
        getFileUrl = '/views/repositories/' + historyManager.get('currentSubSystemUid') + '/file';
        e.loadJSON(`${PATH_PULL_REQUEST}${prId}`, onPRDetailsReceived, settings, true);
    }

    function onPRDetailsReceived(data, status) {
        if (status == 'success') {
            prPrimaryData = data;

            renderPopupBasicTemplate();
            loadFileTabUI();
        }
    }

    function loadFileTabUI(){
        let fileTabData= [];
        let fileObj;
        let fileStringArray=[];
        let fileName;
        let fileName1 = '';
        let fileName2 = '';
        _.each(prPrimaryData.issueData.pr_details, function (item, key) {
            fileObj = item;
            fileObj.fileSig = item.file_name[1] != ""? (item.file_name[1]) : (item.file_name[2]);
            fileObj.index = key;
            fileObj.count = _.filter(item.design_issues, function(o) { return o.occurrence[2]; }).length +_.filter(item.code_issues, function(o) { return o.occurrence[2]; }).length;
            fileName1 = (item.file_name[1]).replace(/\\/g, '/');
            fileName2 = (item.file_name[2]).replace(/\\/g, '/');
            fileStringArray = fileName1 != ""? fileName1.split('/') : fileName2.split('/');
            fileName = fileStringArray[fileStringArray.length - 1];
            fileObj.fileName = fileName;
            fileTabData.push(fileObj);
        });
        //fileTabData.push(fileTabData[0]);
        firstBaseDir = prPrimaryData.issueData.base_dir_1;
        secondBaseDir = prPrimaryData.issueData.base_dir_2;
        (prPrimaryData.issueData.pr_details).sort( function ( a, b ) {
            return (
                parseInt((_.where(b.code_issues,{occurrence: {1: false, 2: true}})).length) +
                parseInt((_.where(b.design_issues,{occurrence: {1: false, 2: true}})).length)
                ) -
                (
                parseInt((_.where(a.code_issues,{occurrence: {1: false, 2: true}})).length) +
                parseInt((_.where(a.design_issues,{occurrence: {1: false, 2: true}})).length)
            );
        });

        for (var i = 0; i < prPrimaryData.issueData.pr_details.length; i++) {
            var file_tab = $('<span/>', { class: 'file_tab  padding_5 text_allign_center p stroke_right stroke_light hand_cursor'});
            var file_name = $('<span/>',{class: 'file_name ellipsis',title: prPrimaryData.issueData.pr_details[i].fileSig}).html(prPrimaryData.issueData.pr_details[i].fileName);
            file_tab.attr('data-file_sig', prPrimaryData.issueData.pr_details[i].fileSig);
            file_tab.attr('data-file_index', prPrimaryData.issueData.pr_details[i].index);

            let fixedCodeIssues = _.where(prPrimaryData.issueData.pr_details[i].code_issues,{occurrence: {1: true, 2: false}});
            let fixedDesignIssues = _.where(prPrimaryData.issueData.pr_details[i].design_issues,{occurrence: {1: true, 2: false}})
            let fixedCount = parseInt(fixedCodeIssues.length) + parseInt(fixedDesignIssues.length);
            fixedCount = fixedCount > 0?'-'+fixedCount:fixedCount;
            let newCodeIssues = _.where(prPrimaryData.issueData.pr_details[i].code_issues,{occurrence: {1: false, 2: true}});
            let newDesignIssues = _.where(prPrimaryData.issueData.pr_details[i].design_issues,{occurrence: {1: false, 2: true}})
            let newCount = parseInt(newCodeIssues.length) + parseInt(newDesignIssues.length);
            newCount = newCount > 0?'+'+newCount:newCount;
            var issueCount = $('<span/>', {class: 'issue-count'});
            var loc_removed = $('<span/>', {class:'loc-removed'});
            loc_removed.html(fixedCount);
            var loc_added = $('<span/>', {class:'loc-added'});
            loc_added.html(newCount);
            issueCount.append(loc_removed, loc_added);
            file_tab.append(issueCount, file_name);
            $('.tab_array').append(file_tab);
            file_tab = null;
        }

        var max_text_size = 0;
        $('.file_tab').each(function () {
            var text_size = e.text.getTextWidth($(this).text(), '12px ubuntu_regular');
            if (text_size > max_text_size){
                max_text_size = text_size;
            }
        });

        if (max_text_size < 140){
            $('.file_tab').width(140);
        } else if(max_text_size > 200){
            $('.file_tab').width(200);
        }else{
            $('.file_tab').width(max_text_size + 'px');
        }

        if(!e.isIE()){
            scroll_object = $('.tab_array').scrollTabs();
        }

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
            codeEditorObj.clearMemory();
            $('.file_tab').removeClass('fill_light');
            $(this).addClass('fill_light');
            $('.file_tab .issue-count').css('background', '#eee');
            $(this).find('.issue-count').css('background', 'white');
            var fileObject = _.findWhere(prPrimaryData.issueData.pr_details, {fileSig:  $(this).attr("data-file_sig")});
            loadFile(fileObject);
        });
        let width = $('.pull-request-panel #popup_content').width() - ($('.code-lane-wrapper').outerWidth(true));
        $('#diff_view').width(width);
        $('.file_tab').first().addClass('fill_light');
        $('.file_tab .issue-count').first().css('background', 'white');
        loadFile(prPrimaryData.issueData.pr_details[0]);
    }

    function renderPopupBasicTemplate() {
        let prBasicData = prPrimaryData.primaryPrData;
        let prBasicIssueData = prPrimaryData.primaryIssueData;
        var pull_request_popup_icon = $('<div/>', { class: 'pull-request-popup-icon ic-pull-request-filled' });
        var code_issue_popup_title = $('<div/>', { class: 'title' });
        code_issue_popup_title.append().text("#" + prBasicData.review_request_id);
        $(".popup_panel_container").addClass("pull-request-panel");

        var desc = $('<div/>', {
            class: 'description',
            title: prBasicData.primary_data.title,
        }).html(prBasicData.primary_data.title);
        var user_info = $('<div/>', {
            class: 'info',
        });
        var src = prBasicData.primary_data.actor.avatar;
        // let carriedOverCount=0;

        // _.each(prPrimaryData.issueData.pr_details, function(prFileItem){
        //     if(! _.isEmpty(prFileItem.code_issues)){
        //         carriedOverCount+=_.size(_.filter(prFileItem.code_issues, function(item){ return item.occurrence[1]&&item.occurrence[2]}));
        //     }
        //     if(! _.isEmpty(prFileItem.code_issues)){
        //         carriedOverCount+=_.size(_.filter(prFileItem.design_issues, function(item){ return item.occurrence[1]&&item.occurrence[2]}));
        //     }
        // });
        var avatar = $('<img/>', { class: 'avatar', src: src });
        // var details = $('<span/>', { class: 'details' }).text('rahul more created 5 min ago:');
        var branchDetailsWrapper = $("<span/>", { class: 'branch-details-wrap' })
        var baseBranchName = $('<span/>', { class: 'branch-name' });
        var branchName = $('<span/>', { class: 'branch-name', });
        var iconWrap = $("<i/>", { class: "ic-arrow-bugprediction" });
        baseBranchName.text(prBasicData.primary_data.sourceBranch);
        branchName.text(prBasicData.primary_data.destinationBranch);
        user_info.append(avatar, details, branchDetailsWrapper);

        branchDetailsWrapper.append(baseBranchName, iconWrap, branchName);

        let actorName = prBasicData.primary_data.actor.displayName;
        let timeDiff = g.difference(Date.parse(new Date()), Date.parse(prBasicData.primary_data.updatedOn));
        var details = $('<span/>', { class: 'details' }).text(actorName + ' updated ' + timeDiff+' :');
        user_info.append(avatar, details, branchDetailsWrapper);

        $('.popup_title_container .popup_title').append(pull_request_popup_icon, code_issue_popup_title, desc, user_info, content);

        var content = $('<div/>', { class: 'header-content' });
        $('.pull-request-panel #popup_content').append(content);

        //let fileCount = parseInt(prBasicData.primary_data.filesAdded) + parseInt(prBasicData.primary_data.filesRemoved) + parseInt(prBasicData.primary_data.filesChanged);
        let fileCount = parseInt(prBasicData.primary_data.filesChanged);
        var newAdded = (prBasicIssueData.code_issues===undefined ? 0 : parseInt(prBasicIssueData.code_issues.added)) + (prBasicIssueData.design_issues===undefined ? 0 : parseInt(prBasicIssueData.design_issues.added));
        var newFixed = (prBasicIssueData.code_issues===undefined ? 0 : parseInt(prBasicIssueData.code_issues.removed)) + (prBasicIssueData.design_issues===undefined ? 0 : parseInt(prBasicIssueData.design_issues.removed));   
        var issueFixed = newFixed > 1 ? " issues fixed ": " issue fixed ";
        var issueAdded = newAdded > 1 ? " issues added ": " issue added ";
        let reviewChangesDetails = {
            commits: prBasicData.primary_data.commits,
            fileCount: fileCount > 1 ? fileCount + " files" : fileCount + " file",
            commitTooltip: prBasicData.primary_data.commits > 1 ? "commits" : "commit",
            newIssues: (prBasicIssueData.code_issues===undefined ? 0 : parseInt(prBasicIssueData.code_issues.added)) + (prBasicIssueData.design_issues===undefined ? 0 : parseInt(prBasicIssueData.design_issues.added)),
            fixedIssues: (prBasicIssueData.code_issues===undefined ? 0 : parseInt(prBasicIssueData.code_issues.removed)) + (prBasicIssueData.design_issues===undefined ? 0 : parseInt(prBasicIssueData.design_issues.removed)),
            pullRequestIssueTooltipText: newAdded == 0 && newFixed == 0 ? "All good!": newFixed == 0 ? newAdded + issueAdded : newAdded == 0 ? newFixed + issueFixed : newFixed + issueFixed + newAdded + issueAdded,
            //carriedOver: carriedOverCount
        }
        $('.pull-request-panel #popup_content').html(Template.reviewChangesDetails(reviewChangesDetails));
    }
    function loadFile(prFileObj) {
        getFile(prFileObj).then(() => {
            var modeName = getLangaugeMode();
            assignHeight();
            setTimeout(() => {
                initUI(prFileObj,modeName);
            }, 500);
        });
    }
    function getLangaugeMode(){
        var modeName;
        getActivelanguageData().then(() => {
            switch (currentLanguage) {
                case 'cpp' || 'c':
                    modeName = 'cpp';
                    break;
                case 'java':
                    modeName = 'java';
                    break;
                case 'c_sharp':
                    modeName = 'csharp';
                    break;
                case 'javascript':
                    modeName = 'javascript';
                    break;
                case 'typescript':
                    modeName = 'typescript';
                    break;
                default:
                    modeName = 'javascript';
                    break;
            }
            return modeName;
        });
    }

    function getFile(pathJson) {
        return new Promise(function (resolve, reject) {
            try {
                var fileUrl = pathJson.file_name;
                var customResponse = {
                    success: {
                        isCustom: false,
                        message: ''
                    },
                    error: {
                        isCustom: true
                    }
                }
                var firstFilePath = '', secondFilePath = '';
                firstFilePath = firstBaseDir + '/' + fileUrl[1];
                secondFilePath = secondBaseDir + '/' + fileUrl[2];
                firstFile = '';
                secondFile = '';
                if(fileUrl[1]!='' && fileUrl[2]!=''){
                    e.loadJSON(getFileUrl, getFirstFileData, { 'path': firstFilePath,
                    'repositoryId': historyManager.get('currentSubSystem'), 'timestamp': new Date().getTime() }, true, customResponse);
                }
                else if(fileUrl[1]!=''){
                    e.loadJSON(getFileUrl, getFirstFileData, { 'path': firstFilePath,
                    'repositoryId': historyManager.get('currentSubSystem'), 'timestamp': new Date().getTime() }, true, customResponse);
                }
                else if(fileUrl[2]!=''){
                    callSecondFile();
                }
                function getFirstFileData(data, status) {
                    if (status == 'success') {
                        var file = data;
                        firstFile = file;
                    } else if (status == 'error') {
                        var data = {
                            status: 'info',
                            type: 'warning',
                            is_info: false,
                            message: '',
                            details: 'No files found',
                            is_add_button: false,
                            button_text: '',
                            is_task_management_button: false,
                            task_management_text: '',
                            button_event: ''
                        };
                        g.error_message_view(data, $('#diff_view'));
                    }
                    if(fileUrl[2]!=''){
                        callSecondFile();
                    }else{
                        resolve();
                    }
                }

                function callSecondFile() {
                    e.loadJSON(getFileUrl, getSecondFileData, { 'path': secondFilePath,
                    'repositoryId': historyManager.get('currentSubSystem'), 'timestamp': new Date().getTime() }, true, customResponse);

                    function getSecondFileData(data, status) {
                        if (status == 'success') {
                            var file = data;
                            secondFile = file;
                        } else if (status == 'error') {
                            var data = {
                                status: 'info',
                                type: 'warning',
                                is_info: false,
                                message: '',
                                details: 'No files found',
                                is_add_button: false,
                                button_text: '',
                                is_task_management_button: false,
                                task_management_text: '',
                                button_event: ''
                            };
                            g.error_message_view(data, $('#diff_view'));
                        }
                        resolve();
                    }
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    function generateIssueData(prObj){

        setFilterStatus();
        let markers1 = {};
        let markers2 = {};
        _.each(prObj.code_issues, function(obj){
            let lineNumber1 = obj.line_number['1'];
            let lineNumber2 = obj.line_number['2'];
            // Define issue type ['fixed', 'new', 'carried']
            let type = "";
            if(!lineNumber1 && lineNumber2)
            {
                type = "new";
            }
            else if(lineNumber1 && !lineNumber2)
            {
                type = "fixed";
            }
            else
            {
                type = "carried";
            }

            if((type =="new") || (type =="fixed") || (type =="carried" && carriedIssueCheck)){
                if(lineNumber1)
                {
                    if(!markers1[lineNumber1])
                    {
                        markers1[lineNumber1] = {
                            "codeIssues" : {
                                class: "issue_"+lineNumber1,
                                set: [
                                    {
                                        type: type,
                                        ruleKey: obj.rulekey,
                                        synopsis: obj.synopsis[1],
                                        criticality: obj.criticality,
                                        kpi: obj.kpi,
                                        module: obj.module
                                    }
                                ]
                            }
                        }
                    }
                    else
                    {
                        (markers1[lineNumber1]['codeIssues']['set']).push({
                            type: type,
                            ruleKey: obj.rulekey,
                            synopsis: obj.synopsis[1],
                            criticality: obj.criticality,
                            kpi: obj.kpi,
                            module: obj.module
                        })
                    }
                }
            }
            if((type =="new" && newIssueCheck) || (type =="fixed" && fixedIssueCheck) || (type =="carried" && carriedIssueCheck)){
                if(lineNumber2)
                {
                    if(!markers2[lineNumber2])
                    {
                        markers2[lineNumber2] = {
                            "codeIssues" : {
                                class: "issue_"+lineNumber2,
                                set: [
                                    {
                                        type: type,
                                        ruleKey: obj.rulekey,
                                        synopsis: obj.synopsis[2],
                                        criticality: obj.criticality,
                                        kpi: obj.kpi,
                                        module: obj.module
                                    }
                                ]
                            }
                        }
                    }
                    else
                    {
                        (markers2[lineNumber2]['codeIssues']['set']).push({
                            type: type,
                            ruleKey: obj.rulekey,
                            synopsis: obj.synopsis[2],
                            criticality: obj.criticality,
                            kpi: obj.kpi,
                            module: obj.module
                        })
                    }
                }
            }
        });
        _.each(prObj.design_issues, function(obj){
            let lineNumber1 = obj.line_number['1'];
            let lineNumber2 = obj.line_number['2'];

            // Define issue type ['fixed', 'new', 'carried']
            let type = "";
            if(!lineNumber1 && lineNumber2 && newIssueCheck)
            {
                type = "new";
            }
            else if(lineNumber1 && !lineNumber2 && fixedIssueCheck)
            {
                type = "fixed";
            }
            else if(carriedIssueCheck)
            {
                type = "carried";
            }
            if((type =="new") || (type =="fixed") || (type =="carried" && carriedIssueCheck)){
                if(lineNumber1) {
                    let set = {
                        type: type,
                        ruleKey: obj.rulekey,
                        synopsis: obj.synopsis[1]
                    };
                    if(!markers1[lineNumber1])
                    {
                        markers1[lineNumber1] = {};
                    }

                    if(!markers1[lineNumber1]['designIssues'])
                    {
                        markers1[lineNumber1]['designIssues'] = {
                            class: "issue_"+lineNumber1,
                            set: [ set ]
                        }
                    }
                    else
                    {
                        (markers1[lineNumber1]['designIssues']['set']).push(set)
                    }
                }
            }
            if((type =="new" && newIssueCheck) || (type =="fixed" && fixedIssueCheck) || (type =="carried" && carriedIssueCheck)){
                if(lineNumber2)
                {
                    let set = {
                        type: type,
                        ruleKey: obj.rulekey,
                        synopsis: obj.synopsis[2]
                    };

                    if(!markers2[lineNumber2])
                    {
                        markers2[lineNumber2] = {};
                    }

                    if(!markers2[lineNumber2]['designIssues'])
                    {
                        markers2[lineNumber2]['designIssues'] = {
                            class: "issue_"+lineNumber2,
                            set: [ set ]
                        }
                    }
                    else
                    {
                        (markers2[lineNumber2]['designIssues']['set']).push(set)
                    }
                }
            }
        });
        return {
            marker1: markers1,
            marker2: markers2
        }
    }

    function initUI(prObj,modeName) {
        codeEditorObj = null;
        var target = document.getElementById("diff_view");
        target.innerHTML = "";
        if (firstFile == undefined) {
            firstFile = '';
        }
        if (secondFile == undefined) {
            secondFile = '';
        }
        var markerSet =  generateIssueData(prObj)

        // console.log(_.sortBy(markers));
        codeEditorObj = new e.codeEditor({
            holder: target,
            inlineDiff : inlineDiffStatus,
            language:modeName,
            fixedIssueCheck:fixedIssueCheck,
            originalFile: {
                file : firstFile,
                markerSet : markerSet.marker1
            },
            modifiedFile: {
                file : secondFile,
                markerSet : markerSet.marker2
            }
        });
        assignHeight();
        createCodeLaneData(prObj);
        handleEvents();
    }
    function createCodeLaneData(prObj){
        setFilterStatus();
        if (prObj.code_issues != undefined) {
            codeIssues = prObj.code_issues;
        }

        if (prObj.design_issues != undefined) {
            designIssues = prObj.design_issues;
        }
        plotIssuesData(codeIssues, designIssues, bugs);
    }

    function setFilterStatus() {
        if($(".commit-history-header .fixed-issues .checkbox:checked").length){
            fixedIssueCheck = true;
        }else{
            fixedIssueCheck = false;
        }
        if($(".commit-history-header .new-issues .checkbox:checked").length){
            newIssueCheck = true;
        }else{
            newIssueCheck = false;
        }
        if($(".commit-history-header .carried-issues .checkbox:checked").length){
            carriedIssueCheck = true;
        }else{
            carriedIssueCheck = false;
        }
    }

    //Plot Issues data and bugs on diff view
    function plotIssuesData(codeIssuesData, designIssuesData, bugsData) {
        _.each(codeIssuesData, function(value,key){value.type = 'codeIssue'});
        _.each(designIssuesData, function(value,key){value.type = 'designIssue'});
        //var lefteditor = $('.CodeMirror')[0].CodeMirror;
        //var righteditor = $('.CodeMirror')[1].CodeMirror;
        var fixedTagData = _.filter(_.union(codeIssuesData, designIssuesData), function (issues) {
            return issues.occurrence['1'] == true && issues.occurrence['2'] == false;
        });
        assignHeight();

        //get data of code issues in code lane
        var filterCodeIssuesData = _.filter(codeIssuesData, function (issues) {
            return issues.occurrence['2'] == true; //All issues except fixed issues
        });
        var withoutaddedCodeIsuuesCount = _.filter(filterCodeIssuesData, function (issues) {
            return issues.occurrence['1'] == true && issues.occurrence['2'] == true;
        });
        var withoutcarriedCodeIsuuesCount = _.filter(filterCodeIssuesData, function (issues) {
            return issues.occurrence['1'] == false && issues.occurrence['2'] == true;
        });

        var finalCodeIssues;
        if(newIssueCheck && carriedIssueCheck){
            finalCodeIssues = filterCodeIssuesData;
        }else if(newIssueCheck && !carriedIssueCheck){
            finalCodeIssues = withoutcarriedCodeIsuuesCount;
        }else if(!newIssueCheck && carriedIssueCheck){
            finalCodeIssues = withoutaddedCodeIsuuesCount;
        }else if(!newIssueCheck && !carriedIssueCheck){
            finalCodeIssues = [];
        }

        //get data of design issues in code lane
        var filterDesignIssuesData = _.filter(designIssuesData, function (issues) {
            return issues.occurrence['2'] == true; //All issues except fixed issues
        });
        var withoutaddedDesignIsuuesCount = _.filter(filterDesignIssuesData, function (issues) {
            return issues.occurrence['1'] == true && issues.occurrence['2'] == true;
        });
        var withoutcarriedDesignIsuuesCount = _.filter(filterDesignIssuesData, function (issues) {
            return issues.occurrence['1'] == false && issues.occurrence['2'] == true;
        });

        var finalDesignIssues;

        if(newIssueCheck && carriedIssueCheck){
            finalDesignIssues = filterDesignIssuesData;
        }else if(newIssueCheck && !carriedIssueCheck){
            finalDesignIssues = withoutcarriedDesignIsuuesCount;
        }else if(!newIssueCheck && carriedIssueCheck){
            finalDesignIssues = withoutaddedDesignIsuuesCount;
        }else if(!newIssueCheck && !carriedIssueCheck){
            finalDesignIssues = [];
        }

        //Get issues data for code lane
        let codeIssuesLane = { markers: [], name: "Code Issues"};
        let issueCriticality = "critical";
        // console.log(finalCodeIssues);
        _.each(finalCodeIssues, function(val, key){
            if(!_.isEmpty(val))
            {
                issueCriticality = getIssueCriticality(_.filter(finalCodeIssues,
                    function(item){
                        return item.line_number['2'] == val.line_number['2'];
                    })
                );
               
                let criticalityLabel = issueCriticality.toLowerCase();
                codeIssuesLane.markers.push({
                    loc : val.line_number['2'],
                    shape : 'square',
                    color : {stroke: e.gradient.getCategoryColor('gradient_rating', issueCriticality.toLowerCase()),fill:textColorCode[criticalityLabel]},
                    label : val.rulekey,
                    location : val.line_number['2']
                })
            }
        });

        let designIssuesLane = { markers: [], name: "Design Issues"};
        _.each(finalDesignIssues, function(val, key){
            if(!_.isEmpty(val))
            {
                designIssuesLane.markers.push({
                    loc : val.line_number['2'],
                    shape : 'hexagon',
                    color : {stroke:"#A060AD",fill:"#D7AEDE"},
                    label : i18next.t("design_issues."+val.rulekey),
                    location : val.line_number['2']
                })
            }
        });
        codeLanePlot(designIssuesLane, codeIssuesLane);
    }

    //Plot code lane data
    function codeLanePlot(designIssuesLane, codeIssuesLane)
    {
        var fileLength = secondFile.split('\n').length;
        var codelaneData = {
            total_loc: fileLength,
            lanes: [designIssuesLane, codeIssuesLane]
        }

        $('#lane_holder').html('');
        $('.designissue-count').prop('title',designIssuesLane.markers.length).text(designIssuesLane.markers.length);
        $('.codeissue-count').prop('title',codeIssuesLane.markers.length).text(codeIssuesLane.markers.length);
        $('.codeissue-count').attr('data-value',codeIssuesLane.markers.length).text(codeIssuesLane.markers.length);
        let width = $('.pull-request-panel #popup_content').width() - ($('.code-lane-wrapper').outerWidth(true));
        $('#diff_view').width(width);

        let height = $('#diff_view').height() - ($('.code-count-wrapper').outerHeight(true)) - 38;
        var options = {
            zoom:{enable:true,mode:"manual",width:100, wedgeHeight:16,targetHeight:50,stroke:"rgba(74,144,226,.4)",fill:"rgba(74,144,226,.05)"},
            blade:{angle:"horizontal"}
        };

        if(($(".codeissue-count").data("value")) > 99) {
            $(".codeissue-count").text("99+");
        }
        //code lane intialization
        var cl = new codeLane("lane_holder",200,height,codelaneData,options);
        assignHeight();
        cl.onClick(function (loc) {
            $(".CodeMirror, .diff-view-file-tabs").css("pointer-events","auto");
            $('.recommandation-container').remove();
            $('.recommandation-warpper').remove();
            codeEditorObj.scrollTo(loc);
        });
    }
    //Assign height to code lane, diff view panel and CodeMirror-gutters
    function assignHeight() {
        var heightFactor = 20;
        var constantHeightFactor = 6;
        let popupTitleContainerH = $('.popup_title_container').outerHeight(true) ;
        let commitHistoryHeaderH =  $('.commit-history-header').outerHeight(true) ;
        let diffContentWrapper = $('.file-tab-content-wrapper').outerHeight(true);

        var totalHeight = popupTitleContainerH+commitHistoryHeaderH +diffContentWrapper;
        var appendHeight = $(window).height() - (totalHeight+heightFactor);
        var diffViewHeight = $(window).height() - (totalHeight + constantHeightFactor);
        $('#diff_view').css({ 'max-height': diffViewHeight, 'height': diffViewHeight });
        $('.CodeMirror').css({ 'max-height': diffViewHeight, 'height': diffViewHeight });
        let laneHeight = appendHeight - ($('.code-count-wrapper').outerHeight(true));
        $('#lane_holder').height(laneHeight);
        $('.code-lane-wrapper').height($(window).height() - (totalHeight + constantHeightFactor));
        $('.code-lane-wrapper').css('border-top','none');
        let width = $('.pull-request-panel #popup_content').width() - ($('.code-lane-wrapper').outerWidth(true));
        $('#diff_view').width(width);
    }
    //Code issues popup
    function codeIssuePopup(request_json, componentDetails) {
        var popup_width = 700;
        var popup_height = 'auto';
        var codeissue_data_main_wrapper = $('<div/>', { class: 'codeissue_data_main_wrapper' });
        var kpiContainer = $('<div/>', { class: 'kpi-container' });
        var kpiName, kpiTags;
        if (request_json.kpi_data.length) {
            kpiName = request_json.kpi_data[0].kpi;
            kpiTags = request_json.kpi_data[0].tags;
        } else {
            kpiName = '';
            kpiTags = '';
        }
        kpiContainer.html(Template.issuesKpi({
            'issues_kpi': kpiName,
            'issues_tags': kpiTags,
            'module_name': i18next.t('rules_config.module_name.' + request_json.module_name),
            'show_icon': false,
            'show_module_name': true
        }));

        kpiContainer.find('.kpi-tag').each(function () {
            if ($(this).find('.kpi-tag-count').text() == '') {
                $(this).find('.kpi-tag-name').addClass('no-tag-count');
            } else {
                $(this).find('.kpi-tag-name').removeClass('no-tag-count');
            }
        });

        var codeissue_data_description = $('<div/>', { class: 'codeissue_data_description' });
        var codeissue_data_description_text = $('<p/>');
        codeissue_data_description.append(codeissue_data_description_text);
        var codeissue_data_details = $('<div/>', { class: 'codeissue_data_details' });
        var codeissue_data_container = $('<div/>', { class: 'codeissue_data_container' });
        codeissue_data_container.append(codeissue_data_description, codeissue_data_details);
        codeissue_data_main_wrapper.append(kpiContainer, codeissue_data_container);
        var issue_popup_title = $('<div/>', { class: 'code-issue-title' });
        issue_popup_title.append(request_json.rule_key);
        var code_issue_popup_icon = $('<div/>', { class: 'code_issue_popup_icon' });
        var code_issue_icon_container = $('<div/>', { class: 'code_issue_popup_icon_container' });
        code_issue_icon_container.append(code_issue_popup_icon);
        var filterComponentDetailsArray = _.findWhere(componentDetails, { rulekey: request_json.rule_key });

        //Get md file data
        $.ajax({
            url: path + request_json.module_name + '/mdfiles',
            dataType: "html",
            data: request_json,
            success: function (data) {
                var md_content = data;
                var converter = new showdown.Converter();
                var md_html_content = converter.makeHtml(md_content);
                codeissue_data_details.append(md_html_content);
                codeissue_data_details.find('a').attr('target', '_blank');
                create_popup(filterComponentDetailsArray);
            },
            error: function (err) {
                if (err.status == 500) {
                    codeissue_data_details.append("No content available.");
                    create_popup(filterComponentDetailsArray);
                }
            }
        });

        //Create popup for md file
        function create_popup(filterCompDetailsArray) {
            codeIssuePopupObj = new e.popup({
                width: popup_width, height: popup_height, default_state: 1, style: { popup_content: { width: '100%', height: popup_height - 30 } }, notify:
                {
                    onPopupClose: 'CODE_ISSUE_POPUP_CLOSE'
                }
            });
            codeIssuePopupObj.addContent(codeissue_data_main_wrapper);
            if (filterCompDetailsArray.criticality == 'info') {
                var info_icon = $('<i/>', { class: 'ic-info-filled' });
                code_issue_popup_icon.append(info_icon);
            } else {
                e.renderIcon(code_issue_popup_icon, filterCompDetailsArray.criticality);
            }

            if (filterCompDetailsArray.synopsis != null) {
                codeissue_data_description_text.append(filterCompDetailsArray.synopsis);
            }
            $('.popup_container .popup_title_container .popup_title').append(code_issue_icon_container, issue_popup_title);
        }
    }

    //Get active language
    function getActivelanguageData() {
        return new Promise(function (resolve, reject) {
            try {
                var settings = { snapshotId: historyManager.get('selectedSnapshots')[0].id };
                e.loadJSON(`${PATH_ACTIVELANGUAGE}${historyManager.get('currentSubSystemUid')}/language`, setActiveLanguage, settings, true);

                //Set active language
                function setActiveLanguage(data, status = 'success') {
                    if (status == 'success') {
                        currentLanguage = data[0].toLowerCase();
                    } else if (status == 'error') {
                        var errorMsg = { "error": { "code": 1922, "name": "LanguageNotFound", "message": "Language not found" } }
                        g.addErrorAlert(errorMsg);
                    }
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    function getIssueCriticality(issueJson){
        var mostCriticalType = 'critical';
        var selectedItem = {};
        var criticalityCheck = true;
        var issueCriticalityArray = ['critical', 'high', 'medium', 'low', 'uncategorised', 'info'];
        //get criticality
        $.each(issueCriticalityArray, function (key, item) {
            for (let index = 0; index < issueJson.length; index++) {
                if (criticalityCheck && issueJson[index].criticality == item) {
                    selectedItem = item;
                    criticalityCheck = false;
                    return;
                }
            }
            if (!_.isEmpty(selectedItem)) {
                mostCriticalType = selectedItem;
                return false;
            }
        });
        return mostCriticalType;
    }
    //Handle events
    function handleEvents() {

        $(document).on("click", '.webui-popover-content .tags_details_popover.tags_popover .code-issues_popup', function (event) {
            $('.popup_panel_container.pull-request-panel').css('z-index', '1');
            $('.webui-popover').hide();
            var kpiData = _.uniq(_.where(codeIssues, { rulekey: $(this).data('rule_key') }));
            codeIssuePopup({ 'module_name': $(this).data('module_name'), 'rule_key': $(this).data('rule_key'), 'issue_id': 592325, 'kpi_data': kpiData }, codeIssues);
            event.stopImmediatePropagation();
        });

        $(window).on('resize', function () {
            assignHeight();
        });

        $(".commit-history-header .issues-kind .checkbox").off().on('change', function () {
            var fileObject = _.findWhere(prPrimaryData.issueData.pr_details, {fileSig:  $('.file_tab.fill_light').attr("data-file_sig")});
            var modeName = getLangaugeMode();
            initUI(fileObject,modeName);
        });
        $(".commit-history-header .toggle-editor .checkbox").off().on('change', function () {
            inlineDiffStatus = $(".commit-history-header .toggle-editor .checkbox:checked").length ?true:false;
            codeEditorObj.toggleDiffView(inlineDiffStatus);
        });
    }
    //----- public functions ----------
    return {
        openCodeHistoryPopup: function (prId) {
            unSubscribeEvents();
            subscribeEvents();
            openCodeHistoryPopup(prId);
        }
    };
}(g);