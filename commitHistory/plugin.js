
(function (g) {
    g.commitHistory = function () {
        var template = Template;
        var onlyBugs = '';
        var ems = e;
        var i18n = i18next;
        var hm = historyManager;
        var uds = _;
        var jq = $; //use it for jquery
        var currentIssueContext = 'pull_request';
        var PATH_COMMIT_HISTORY = `/views/repositories/${hm.get('currentSubSystemUid')}/commits`;
        var PATH_PULL_REQUEST = `/views/repositories/${hm.get('currentSubSystemUid')}/pullrequests`;
        var PATH_WEBHOOK = `/views/repositories/${hm.get('currentSubSystemUid')}/webhooks`;
        var PATH_RE_SCAN_STATUS = `/repositories/${hm.get('currentSubSystemUid')}/trainmodelstatus`;
        var PATH_USER_AVATARS = `/views/repositories/${hm.get('currentSubSystemUid')}/commituseravatars`;
        var pluginContainer, commitHistoryData = [], pullRequestData = [], commitHistoryStepper;
        var searchString = '', searchInterval = 0, RECORDS_PER_PAGE = 20,listCurrentCount = 0, listCurrentPage = 1, totalListPages, totalCommits, startIndex = 0, PATH_COMMIT_SNAPSHOT;
        var stopIndex = startIndex + RECORDS_PER_PAGE;
        var statusData ;
        var historySettings = {};

        function init(holder) {
            var tab_container = $('<div/>', {class: 'tab_container',id: ""});
            // var notification_wrapper= $('<div/>', {class: 'notification_Wrapper'});
            var tabs_container1 =jq(".tabs_container");
            var repoPREnable = false;
            var repoREEnable = false;

            repoPREnable  = historyManager.get('currentRepoMetaData').prEnable;
            repoREEnable  = historyManager.get('currentRepoMetaData').reEnable;
            tabs_container1.css("display", "none");
            if((g.enablePRScan || g.enablePRScan == "true") && repoPREnable && repoREEnable && (g.enableREScan || g.enableREScan == "true") ){
                tabs_container1.css("display", "block");
                tabs_container1.html(Template.switchContainer({
                    'push_history': "Pull Requests",
                    'commit': "commits",
                }));
            } else if((g.enablePRScan || g.enablePRScan == "true") && repoPREnable){
                //$('.panel_header[data-holder_id="commit_history"] .panel_title_text').text('Pull requests');
                currentIssueContext = 'pull_request';
            }else if((g.enableREScan || g.enableREScan == "true") && repoREEnable){
                //$('.panel_header[data-holder_id="commit_history"] .panel_title_text').text('Commits');
                currentIssueContext = 'commits';
            }
            //$('#commit_history .panel_title_text').text('Pull Request');
            jq(".panel_header .commit_history_container").append(tab_container);

            jq('.panel_header .save-file-to-staged').remove();
            historySettings = {
                repository_id: hm.get('currentSubSystem'),
                node_id: hm.get('currentBreadcrumb').id,
                repository_uid: hm.get('currentSubSystemUid')
            };
            if (g.loadFromHistory) // if browser back button or refresh is clicked, get data from history
            {
                var currentHistoryState = g.decodeURL(window.location.hash);
                if (!(jq.isEmptyObject(currentHistoryState))) {
                    g.loadFromHistory = false;
                }
            } else // else push data to history
            {
                if (hm.get('selectedSnapshots').length !== 0) {
                    historySettings.snapshot_id = hm.get('selectedSnapshots')[0].id;
                }
                g.pushHistory('commit_history', hm.get('currentContext'), {}, historySettings);
            }
            if(historyManager.get('selectedTabView') == ""){
                historyManager.set('selectedTabView', currentIssueContext);
            }
            currentIssueContext  = historyManager.get('selectedTabView');
            //if()
            pluginContainer = jq('<div/>', {
                class: 'plugin_container plugin-commit-history unselectable large-11'
            });
            holder.append(pluginContainer);

            holder.css('overflow', 'auto');
            tabSelection(currentIssueContext);

            if(currentIssueContext == "pull_request"){
                getWebhookData();
            }else{
                jq(".switchbutton_container .switch_menu.commit-tab").addClass('switch_button_selection');
                getCommitHistoryData();
            }
            unSubscribeIssuesEvents();
            subscribeIssuesEvents();
            handleEvents();

        }

        function onSwitchButtonClicked(clicked_item) {
            if (clicked_item.attr('data-tab') == 'pull-request-tab') {
                currentIssueContext = 'pull_request';
                getPullRequestData();
            } else {
                currentIssueContext = 'commits';
                onlyBugs = '';
                getCommitHistoryData();
            }
            tabSelection(currentIssueContext);

            historyManager.set('selectedTabView', currentIssueContext);
           // g.pushHistory('commit_history', hm.get('currentContext'), {}, historySettings);

        }
        function updateListItem(socketData){
            if(socketData.repositoryUid == historyManager.get('currentSubSystemUid')){
                getPullRequestData();
            }
        }
        function tabSelection(tabId){
            $('.panel_header[data-holder_id="commit_history"] .panel_title_text').text('Development History');
            switch(tabId){
                case "pull_request":
                    $(".commit-history").css("display", "none");
                    $(".pull-request").css("display","block");
                    $('.panel_header[data-holder_id="commit_history"] .panel_title_icon').removeClass('ic-commit').addClass('ic-pull-request');
                break;
                case "commits":
                    $(".commit-history").css("display", "block");
                    $(".pull-request").css("display","none");
                    $('.panel_header[data-holder_id="commit_history"] .panel_title_icon').removeClass('ic-pull-request').addClass('ic-commit');
                break;
                default:
                break;
            }
        }
        function getPullRequestData() {
            ems.loadJSON(`${PATH_PULL_REQUEST}`, onPRListReceived,  { repositoryId : historyManager.get('currentSubSystem')}, true );
        }

        function getWebhookData(){
            ems.loadJSON(`${PATH_WEBHOOK}/status`, onWebhookListReceived, true );
        }

        function onWebhookListReceived(data,status){
            if(status == "success") {
                statusData = data;
                /* if(statusData.pr_enable && !statusData.webhook_exist){
                    enableWebhook();
                } */
                jq(".tabs_container .switchbutton_container .pull-request-tab").addClass("switch_button_selection");
                getPullRequestData();
            }
        }
        function onPRListReceived(data, status) {
            if (status == 'success') {
                /* _.sortBy(_.sortBy(data, function(item){
                    return item.review_request_id;
                }).reverse(), function(item){
                    return !item.scanInProgress;
                }); */
                pullRequestData = data;
                renderPRList(data);
                handleUiEvents();
                //loadAvatar(authorEmails);
            }
        }
        function getCommitHistoryData() {
            onlyBugs = onlyBugs === ""?true:jq(".filter-commits-wrapper .filter-commits-checkbox-label .checkbox").prop('checked');
            var requestSettings = {
                'offset': startIndex,
                'limit': RECORDS_PER_PAGE,
                'likely_bugs': onlyBugs,
                'search': jq('.plugin-commit-history .section-search-container #search-box').val()
            };

            ems.loadJSON(`${PATH_COMMIT_HISTORY}`, onCommitListReceived, requestSettings, true );
        }

        function onCommitListReceived(data, status) {
            if (status == 'success') {
                commitHistoryData = data.commits;
                totalCommits = data.total_count;
                // find unique author emails
                var authorEmails = _.unique(_.pluck(commitHistoryData, 'author_email'));
                //renderPluginUI();
                renderCommitHistory();
                handleUiEvents();
                loadAvatar(authorEmails);
            }
        }
        /*
         * Load avatar
         */
        function loadAvatar(emails)
        {
            // Get existing avatars from local storage
            // var existingAvatars = JSON.parse(localStorage.getItem('gitavatars'));

            // // Filter emails which have avatars in local storage
            // emails = _.filter(emails, function(email) {
            //     return !(_.some(existingAvatars, function (o) { return _.has(o, email); }));
            // });

            // var requestData = {
            //     'emails': emails
            // };

            // var customResponse ={
            //     success:{
            //         isCustom: true,
            //         message : null
            //     },
            //     error:{
            //         isCustom:true
            //     }
            // }

            // ems.postData(`POST`, `${PATH_USER_AVATARS}`, function (data, status) {
            //     if (status == 'success' && data) {
            //         // Merge existing avatars and received data
            //         var avatarsMergeData = _.union(existingAvatars, data);
            //         // Store combine data into local storage
            //         localStorage.setItem('gitavatars', JSON.stringify(avatarsMergeData));
            //         _.each(avatarsMergeData, function(v,k){
            //             var key = Object.keys(v)[0];
            //             var value = v[key];
            //             jq('.plugin-commit-history span[data-email="' + key + '"]').css({ 'background-image': 'url('+value+')'});
            //             jq('.plugin-commit-history span[data-email="' + key + '"]').closest('a').attr('data-avatar',value);
            //         });
            //     }
            // }, requestData, customResponse);
        }

        // function renderPluginUI() {
        //     renderCommitHistory();
        // }
        function renderPRList() {
            var prListTemplateData = [];
            var prObj = {};
            let fileCount = 0;
            uds.each(pullRequestData, function (item, key) {
                prObj = {};
                prObj.prId = item.review_request_id;
                prObj.title = item.primary_data.title;
                prObj.commits = item.primary_data.commits;
                prObj.commitTooltip = prObj.commits > 1 ? "commits" : "commit";
                prObj.actor = item.primary_data.actor.displayName;
                prObj.scanInProgress = item.scanInProgress;
                prObj.status = item.status;
                // prObj.issuesRemoved = "issues fixed" ;
                // prObj.issuesAdded =  "issues added";
                // prObj.allGood = "All good!";
                prObj.sessionId = item.session_id;
                //fileCount = parseInt(item.primary_data.filesAdded) + parseInt(item.primary_data.filesRemoved) + parseInt(item.primary_data.filesChanged);
                fileCount = parseInt(item.primary_data.filesChanged);
                //commitObj.fixedBugs = item.nFixedIssues;
                let pullRequestButtonText, pullRequestStatusText, pullRequestStatusClass, pullRequestTooltipText;
                let isSuccess = true;
                switch(true){
                    case (item.scanInProgress) :
                        pullRequestButtonText = "Abort";
                        pullRequestStatusText = "Scanning";
                        isSuccess = false;
                        break;
                    case (item.status == 'QUEUED'):
                        pullRequestButtonText = "Cancel";
                        pullRequestStatusText = i18next.t('commit_history.pull-request.queue');
                        pullRequestStatusClass = "scan-no-data";
                        pullRequestTooltipText = "In queue!";
                        isSuccess = false;
                        break;
                    case (item.status == 'SUCCESS') :
                        pullRequestButtonText = "View Details";
                        pullRequestStatusText = "";
                        pullRequestStatusClass = "scan-success";
                        pullRequestTooltipText = "";
                        break;
                    case (item.status == 'FAIL') :
                        pullRequestButtonText = "Retry";
                        pullRequestStatusText = i18next.t('commit_history.pull-request.scanFailed');
                        pullRequestStatusClass = "scan-fail";
                        pullRequestTooltipText = "Scan failed!";
                        isSuccess = false;
                        break;
                    case (item.status == 'ABORT') :
                        pullRequestButtonText = "Scan";
                        pullRequestStatusText = i18next.t('commit_history.pull-request.scanAbort');
                        pullRequestStatusClass = "scan-abort";
                        pullRequestTooltipText = "Scan aborted.";
                        isSuccess = false;
                        break;
                    case (item.status == 'CANCEL'):
                        pullRequestButtonText = "Scan";
                        pullRequestStatusText = i18next.t('commit_history.pull-request.scanCancel');
                        pullRequestStatusClass = "scan-abort";
                        pullRequestTooltipText = "Scan request cancelled.";
                        isSuccess = false;
                        break;
                    case (item.status == 'NO_FILES'):
                        pullRequestStatusText = i18next.t('commit_history.pull-request.noFiles',{'language':g.active_language});
                        pullRequestStatusClass = "delete-files";
                        pullRequestTooltipText = "No "+g.active_language+" file to scan.";
                        isSuccess = false;
                        break;
                    case (item.status == 'FORK'):
                        pullRequestStatusText = i18next.t('commit_history.pull-request.unSuppoted');
                        pullRequestStatusClass = "fork-files";
                        pullRequestTooltipText = "Pull requests for forked repositories are not supported currently.";
                        isSuccess = false;
                        break;
                    default:
                        pullRequestButtonText =  "Scan";
                        pullRequestStatusText = i18next.t('commit_history.pull-request.noData');
                        pullRequestStatusClass = "scan-no-data";
                        pullRequestTooltipText = "No data found!";
                        isSuccess = false;
                        break;
                }
                prObj.filesCount = fileCount > 1 ? fileCount + " files" : fileCount + " file";
                if (fileCount == 300) {
                    prObj.changedTooltip = fileCount + " (or more) files changed";
                } else if (fileCount > 1) {
                    prObj.changedTooltip = fileCount + " files changed";
                } else {
                    prObj.changedTooltip = fileCount + " file changed";
                }
                if(!item.scanInProgress&&!_.isEmpty(item.issues)){
                    prObj.newIssues = (item.issues.code_issues===undefined ? 0 : parseInt(item.issues.code_issues.added)) + (item.issues.design_issues===undefined ? 0 : parseInt(item.issues.design_issues.added));
                    prObj.fixedIssues = (item.issues.code_issues===undefined ? 0 : parseInt(item.issues.code_issues.removed)) +(item.issues.design_issues===undefined ? 0 : parseInt(item.issues.design_issues.removed));
                }
                prObj.date = g.difference(Date.parse(new Date()), Date.parse(item.primary_data.updatedOn));
                prObj.pullRequestButtonText = pullRequestButtonText;
                prObj.pullRequestStatusText = pullRequestStatusText;
                prObj.pullRequestTooltipText = pullRequestTooltipText;
                prObj.isSuccess = isSuccess;
                prObj.noNewIssues = prObj.newIssues == 0 ? true: false;
                prObj.noIssues = ((prObj.newIssues == 0 || prObj.newIssues == undefined) && (prObj.fixedIssues == 0 || prObj.fixedIssues == undefined)) ? true: false;
                prObj.issueFixed = prObj.fixedIssues> 1 ? " issues fixed ": " issue fixed ";
                prObj.issueAdded = prObj.newIssues > 1 ? " issues added ": " issue added ";
                prObj.pullRequestIssueTooltipText = prObj.noIssues ? "All good!": prObj.noNewIssues ? prObj.fixedIssues+prObj.issueFixed : prObj.fixedIssues == 0 ? prObj.newIssues+prObj.issueAdded : prObj.fixedIssues+prObj.issueFixed+prObj.newIssues+prObj.issueAdded;
                prObj.pullRequestStatusClass = pullRequestStatusClass;
                prListTemplateData.push(prObj);
            });
            pluginContainer.html(template.pullRequestList({
                "listData": prListTemplateData,
                "showStepper":(searchString == '') ? true : false,
                "pages": i18n.t('common.pagination.pages'),
                "Showing": i18n.t('common.pagination.showing')
            }));
            $('.pull-request .commit-history-body ul li').each(function(){

                if($(this).find('.number').hasClass('btn-delete-files')){
                    $(this).find('.btn-delete-files .button-wrap').hide();
                };
                if($(this).find('.number').hasClass('btn-fork-files')){
                    $(this).find('.btn-fork-files .button-wrap').hide();
                };
                if ($(this).find('.number').hasClass('fork-files-commit')) {
                    $(this).find('.fork-files-commit').text(' - - ').attr('title',i18next.t('commit_history.pull-request.NA'));
                }
                if ($(this).find('.number').hasClass('fork-files-document')) {
                    $(this).find('.fork-files-document').text(' - - ').attr('title',i18next.t('commit_history.pull-request.NA'));                }

            });




            // jq('.plugin-commit-history .section-search-container #search-box').val(searchString);
            // if(searchString != '')
            // {
            //     jq('.plugin-commit-history .section-search-container #search-box').focus();
            // }
            // prListTemplateData.length && statusData.pr_enable Need change
            if (prListTemplateData.length) {
                // commitHistoryStepper = new e.numericStepper({
                //     holder: '.commit-history-stepper',
                //     stepperType: 'componentlist',
                //     callback: {
                //         onTextChange: ''
                //     },
                //     notify: {
                //         onTextChange: 'LOAD_LIST_PAGE'
                //     }
                // });
                // addListNumericStepper();
            }
            else {

                var data = {
                    status: 'info',
                    type: 'warning',
                    is_info: false,
                    message: "",
                    details: i18n.t('common.info_description.no_pull_request_found'),
                    pullRequest:i18next.t('common.pullRequest') ,
                    is_add_button: false,
                    button_text: i18next.t('common.add_new.enable_hook'),
                    is_task_management_button: false,
                    task_management_text: '',
                    button_event: ''
                };

                if(!statusData.public_url){
                    data.details = i18n.t('common.info_description.no_public_url');
                }else if(!statusData.pr_enable){
                    data.details = i18n.t('common.info_description.webhook_not_enable');
                    data.button_text = i18next.t('common.add_new.enable_hook');
                    data.is_add_button = true;
                    $('.no-commits').addClass('js-enable-hook');
                }/* else if(statusData.webhook_exist && statusData.metadata != 'undefined' && (statusData.metadata.active == false || statusData.metadata.active == 'false') && typeof statusData.metadata.webhook_message != "undefined" && statusData.metadata.webhook_message != undefined ){
                    // Show popup on error message for webhook failure
                    data.details = statusData.metadata.webhook_message;
                    data.button_text = i18next.t('common.add_new.create_hook');
                    data.is_add_button = false;
                } */

                g.error_message_view(data, $('.plugin-commit-history .no-commits'));
            }
            $('.commit-history *[title]').tooltipster();
            $('.commit-history-header *[title]').tooltipster();
        }
        function renderCommitHistory() {
            var commitHistoryTemplateData = [];
            var commitObj = {};
            uds.each(commitHistoryData, function (item, key) {
                commitObj = {};
                commitObj.addedLOC = item.added_lines;
                commitObj.username = item.author;
                // Temp code
                // commitObj.author_email = item.author_email=='shantanu.bedarkar@acellere.com'?'bipin.patel@acellere.com':item.author_email;
                commitObj.author_email = item.author_email;
                commitObj.commitID = item.commit_id;
                commitObj.shortCommitID = item.commit_id.substring(0, 7);
                commitObj.removedLOC = item.deleted_lines;
                commitObj.likelyBugs = item.nLikelyIssues;
                //commitObj.fixedBugs = item.nFixedIssues;
                commitObj.filesCount = item.nfiles > 1 ? item.nfiles + " files" : item.nfiles + " file";
                commitObj.commitMsg = item.subject;
                commitObj.timeline = g.difference(Date.parse(new Date()), Date.parse(item.timestamp));
                commitObj.filesStatusTootltip = '';
                if (item.nfiles_improved) {
                    commitObj.filesStatusTootltip += item.nfiles_improved + " Files Improved, "
                }
                if (item.nfiles_deteriorated) {
                    commitObj.filesStatusTootltip += item.nfiles_deteriorated + " Files Deteriorated, "
                }
                if (item.nfiles_nochange) {
                    commitObj.filesStatusTootltip += item.nfiles_nochange + " Files Unchanged";
                }

                commitObj.filesStatusTootltip = _.trim(commitObj.filesStatusTootltip,', ');

                commitObj.nfiles_improved = item.nfiles_improved;
                commitObj.nfiles_deteriorated = item.nfiles_deteriorated;
                commitHistoryTemplateData.push(commitObj);
            });

            pluginContainer.html(template.commitHistoryList({
                "listData": commitHistoryTemplateData,
                "pages": i18n.t('common.pagination.pages'),
                "Showing": i18n.t('common.pagination.showing'),
                "filterCheckboxStatus": onlyBugs
            }));
            jq('.plugin-commit-history .section-search-container #search-box').val(searchString);
            if(searchString != '')
            {
                jq('.plugin-commit-history .section-search-container #search-box').focus();
            }
            if (commitHistoryTemplateData.length) {
                commitHistoryStepper = new e.numericStepper({
                    holder: '.commit-history-stepper',
                    stepperType: 'componentlist',
                    callback: {
                        onTextChange: ''
                    },
                    notify: {
                        onTextChange: 'LOAD_LIST_PAGE'
                    }
                });
                addListNumericStepper();
            }
            else {
                ems.loadJSON(`${PATH_RE_SCAN_STATUS}`, onReStatusReceived, {}, true );
            }
            $('.commit-history *[title]').tooltipster();
            jq(".filter-commits-wrapper .filter-commits-checkbox-label .checkbox").change(function () {
                startIndex = 0;
                listCurrentPage = 1;
                getCommitHistoryData();
            });
        }

        function onReStatusReceived(data, status) {
            let msg = i18n.t('common.info_description.no_commits_found');
            if (data.status == 'ACTIVE') {
                msg = 'RE scan is in-progress';
            }
            else if (data.status == 'QUEUED') {
                msg = 'RE scan queued';
            }
            else if (data.status == 'ERROR') {
                msg = 'RE scan has failed';
            }
            var data = {
                status: 'info',
                type: 'warning',
                is_info: false,
                message: '',
                details: msg,
                is_add_button: false,
                button_text: '',
                is_task_management_button: false,
                task_management_text: '',
                button_event: ''
            };
            g.error_message_view(data, $('.plugin-commit-history .no-commits'));
        }

        function addListNumericStepper() {
            try {
                listCurrentCount = (listCurrentPage - 1) * RECORDS_PER_PAGE;
                totalListPages = Math.ceil(totalCommits / RECORDS_PER_PAGE);
                commitHistoryStepper.setValue(listCurrentPage);
                commitHistoryStepper.setMaxValue(totalListPages);
                stopIndex = listCurrentCount + commitHistoryData.length;
                startIndex = listCurrentCount;
                var commitHistoryPagination = $('.commit-history-pagination');
                commitHistoryPagination.find('.page-number').html(commitHistoryStepper.getValue() + '/' + totalListPages);
                commitHistoryPagination.find('.showing-value').html((startIndex + 1) + " - " + stopIndex + " / " + totalCommits);

                if (totalListPages <= 1) {
                    commitHistoryPagination.find('.paginationTitle, .colon, .page-number, .commit-history-stepper').hide();
                } else {
                    commitHistoryPagination.find('.paginationTitle, .colon, .page-number, .commit-history-stepper').show();
                }
            } catch (e) {
                console.log(e);
            }
        }

        //On Stepper Click
        function onStepperClick() {
            listCurrentPage = commitHistoryStepper.getValue();
            addListNumericStepper();
            getCommitHistoryData();
        }

        function enableWebhook(){
            var customResponse ={
                success:{
                    isCustom: false,
                    message : 'Webhook created successfully'
                },
                error:{
                    isCustom:true
                }
            };

            ems.postData("POST",`${PATH_WEBHOOK}`, function (data, status) {
                if(status == 'success') {
                    setTimeout(function () {
                        ems.notify('PLUGIN_UPDATE');
                    },100);
                }
            }, '', customResponse);
        }

        function handleUiEvents() {

            $('.status .icon-contianer i[title]').tooltipster();

            $( ".scan-success-item" ).click(function(eve) {
                eve.preventDefault();
                eve.stopPropagation();
                let prId = $(this).attr('data-prid');
                g.application.repository.pullRequest.openCodeHistoryPopup(prId);
            });
            jq(".pull-request .view-code").off("click").on("click", function (eve) {
                let currentStatus = $(this).attr('data-status');
                if (currentStatus == 'SUCCESS') {
                    eve.preventDefault();
                    eve.stopPropagation();
                    let prId = $(this).parents('.list-item').attr('data-prid');
                    g.application.repository.pullRequest.openCodeHistoryPopup(prId);
                }
                else if (currentStatus == 'IN_PROGRESS' || currentStatus == 'QUEUED') {
                    eve.stopPropagation();
                    var scanId = $(this).attr('data-scan_id');
                    e.subscribe('CONFIRM_POPUP_CLOSE', g.admin.utils.onConfirmPopupClose);

                    function onPRScanAborted(data, status) {
                        //$(eve.currentTarget).removeClass('disabled');
                        if (status == 'success') {
                            //$(eve.currentTarget).text('Scan');
                            //$(eve.currentTarget).attr('data-status', 'ABORT');
                            /*gamma.pushHistory('admin_details','','',{'default_parameter':'analysis_queue','breadcrumb':'analysis_queue'},'management');
                            gamma.admin.analysis.analysis_queue.loadAnalysisQueueList(true);*/
                        } else if (status == 'error') {
                           // $(eve.currentTarget).text('Scan');
                            //gamma.sendErrorNotification(data, `/abort`, '');
                        }
                    }

                    function showConfirmPopup() {
                        var confirmMsg = '',successMsg = '';
                        if (currentStatus == 'IN_PROGRESS') {

                            confirmMsg = "You are about to abort scan of pull request "+scanId+".<br/>Do you want to proceed anyway?";
                            successMsg = null;
                        }
                        else {
                            confirmMsg = "You are about to cancel scan of pull request "+scanId+".<br/>Do you want to proceed anyway?";
                            successMsg = "Pull request scan cancelled successfully.";
                        }
                        var confirm_alert = g.admin.utils.confirmPopup(confirmMsg, 'warning', true, false, false);
                        $('.no_button').on('click', function () {
                            confirm_alert.closePopup();
                        });

                        $('.yes_button').on('click', function () {
                            $(eve.currentTarget).text('Aborting');
                            $(eve.currentTarget).addClass('disabled');
                            confirm_alert.closePopup();
                            var customResponse = {
                                success: {
                                    isCustom: true,
                                    message: successMsg
                                },
                                error: {
                                    isCustom: false
                                }
                            };
                            e.postData('POST', `/views/repositories/${hm.get('currentSubSystemUid')}/prscans/${scanId}/abort`, onPRScanAborted, {}, customResponse);
                        });
                    }
                    showConfirmPopup();
                }
                else if (currentStatus == 'ABORT' || currentStatus == 'FAIL' || currentStatus == 'CANCEL' || currentStatus == '') {
                    function onPRScanStarted(data, status) {
                        /* $(eve.currentTarget).text('Abort Scan');
                        $(eve.currentTarget).attr('data-status','IN_PROGRESS'); */
                        if (status == 'success') {
                            //$(eve.currentTarget).text('Scan');
                            /*gamma.pushHistory('admin_details','','',{'default_parameter':'analysis_queue','breadcrumb':'analysis_queue'},'management');
                            gamma.admin.analysis.analysis_queue.loadAnalysisQueueList(true);*/
                        } else if (status == 'error') {
                            //$(eve.currentTarget).text('Scan');
                            //gamma.sendErrorNotification(data, `/abort`, '');
                        }
                    }
                    var customResponse = {
                        success: {
                            isCustom: true,
                            message: "Pull request scan started successfully."
                        },
                        error: {
                            isCustom: false
                        }
                    };
                    let prId = $(this).parent().parent().parent().parent().attr('data-prid');
                    e.postData('POST', `/views/repositories/${hm.get('currentSubSystemUid')}/pullrequests/${prId}/scan`, onPRScanStarted, {}, customResponse);
                }
            });

            jq(".commit-list-item").on("click", function (eve) {
                eve.preventDefault();
                eve.stopPropagation();
                var commitId = $(this).attr('data-commitid');
                g.application.repository.commitDetails.openCommitDetailsPopup(commitId);
            });

            jq(document).off('keyup').on('keyup', '.plugin-commit-history .section-search-container #search-box', function () {
                clearInterval(searchInterval);
                searchInterval = setInterval(function () {
                    searchString = (jq('.plugin-commit-history .section-search-container #search-box').val()).trim();
                    getCommitHistoryData();
                    clearInterval(searchInterval);
                }, 500);
            });

            // Enable webhook for repository
            jq('.js-enable-hook .add_button').on('click',function(e){
                var customResponse ={
                    success:{
                        isCustom: true,
                        message : 'Pull request enabled successfully'
                    },
                    error:{
                        isCustom:true
                    }
                };

                ems.postData("POST",`${PATH_WEBHOOK}/status`, function (data, status) {
                    if(status == 'success') {
                        setTimeout(function () {
                            ems.notify('PLUGIN_UPDATE');
                        },100);
                    }
                }, { enable : true }, customResponse);
            });
        }


        function handleEvents(){

           // jq(".tabs_container .switchbutton_container .pull-request-tab").addClass("switch_button_selection");
            jq(document).off('click', '.tabs_container .switchbutton_container .switch_menu');
            jq(".tabs_container .switchbutton_container .switch_menu").on('click', function () {
                jq('.switchbutton_container .switch_button_selection').removeClass('switch_button_selection');
                jq(this).addClass('switch_button_selection');
                onSwitchButtonClicked(jq(this));
            });

            function onResize() {
               if ($('.content_holder').width () < 1200) {
                   var listWidth= $('.content_holder').width ();
                    $('.pull-request .details-content .message ').css({'max-width': '15em','width': '10em'});
                    $('.heading.number.btn').hide();
                    $('.row-container.number.btn-scan-success, .btn-delete-files, .btn-fork-files, .scan-no-data, .scan-fail, .scan-abort').hide();
                    $('.commit-wraper .view-code').hide();
                    $('.stage').parent().parent().hide();
                }
                if($(window).load()){
                    if ($('.content_holder').width() > 1200) {
                        $('.pull-request .details-content .message ').css({'max-width': '20em','width': '15em'});
                        $('.heading.number.btn').show();
                        $('.row-container.number.btn-scan-success, .btn-delete-files, .btn-fork-files, .scan-no-data, .scan-fail, .scan-abort').show();
                        $('.commit-wraper .view-code').show();
                        $('.stage').parent().parent().show();
                    }
                }
            }

        //--------------------- handle different profile list events ----------------------

            $(window).on('resize.quality_profile', function () {
                onResize();

            });
        }

        function subscribeIssuesEvents() {
            e.subscribe('LOAD_LIST_PAGE', onStepperClick);
            e.subscribe('REVIEW_REQUEST_UPDATE', updateListItem);
        }

        function unSubscribeIssuesEvents() {
            e.unSubscribe('LOAD_LIST_PAGE');
            e.unSubscribe('REVIEW_REQUEST_UPDATE');
        }
        // Clear Memory
        function clearMemory() {
            unSubscribeIssuesEvents();
            jq(document).off('keyup', '.plugin-commit-history .section-search-container #search-box');
        }

        //---------- PUBLIC METHODS ------------
        return {
            initPlugin: function (holder) {
                init(holder);
            },
            clearMemory: function () {
                clearMemory();
            }
        };
    };
    return g;
})(g);
