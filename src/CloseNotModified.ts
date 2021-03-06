import { DocumentManager, FileSystem, MainViewManager } from "./brackets-modules";
import * as Events from "./Events";
import EventEmitter from "./EventEmitter";
import * as Git from "./git/Git";
import * as Preferences from "./Preferences";
import * as Strings from "strings";

var $icon = $(null);

function handleCloseNotModified(event) {
    var reopenModified = false;
    if (event.shiftKey) {
        reopenModified = true;
    }

    Git.status().then(function (modifiedFiles) {
        var openFiles      = MainViewManager.getWorkingSet(MainViewManager.ALL_PANES),
            currentGitRoot = Preferences.get("currentGitRoot");

        openFiles.forEach(function (openFile) {
            var removeOpenFile = true;
            modifiedFiles.forEach(function (modifiedFile) {
                if (currentGitRoot + modifiedFile.file === openFile.fullPath) {
                    removeOpenFile = false;
                    modifiedFile.isOpen = true;
                }
            });

            if (removeOpenFile) {
                // check if file doesn't have any unsaved changes
                var doc = DocumentManager.getOpenDocumentForPath(openFile.fullPath);
                if (doc && doc.isDirty) {
                    removeOpenFile = false;
                }
            }

            if (removeOpenFile && !reopenModified) {
                MainViewManager._close(MainViewManager.ALL_PANES, openFile);
            }
        });

        if (reopenModified) {
            var filesToReopen = modifiedFiles.filter(function (modifiedFile) {
                return !modifiedFile.isOpen;
            });
            filesToReopen.forEach(function (fileObj) {
                var fileEntry = FileSystem.getFileForPath(currentGitRoot + fileObj.file);
                MainViewManager.addToWorkingSet(MainViewManager.ACTIVE_PANE, fileEntry);
            });
        }

        MainViewManager.focusActivePane();
    });
}

function updateIconState() {
    if (MainViewManager.getPaneCount() === 1 &&
        MainViewManager.getWorkingSetSize(MainViewManager.ACTIVE_PANE) === 0) {
        $icon.toggleClass("working-set-not-available", true);
        $icon.toggleClass("working-set-available", false);
    } else {
        $icon.toggleClass("working-set-not-available", false);
        $icon.toggleClass("working-set-available", true);
    }
}

export function init() {
    // Add close not modified button near working files list
    $icon = $("<div/>")
        .addClass("git-close-not-modified btn-alt-quiet")
        .attr("title", Strings.TOOLTIP_CLOSE_NOT_MODIFIED)
        .html("<i class='octicon octicon-remove-close'></i>")
        .on("click", handleCloseNotModified)
        .appendTo("#sidebar");
    updateIconState();
}

EventEmitter.on(Events.GIT_ENABLED, function () {
    $icon.show();
});

EventEmitter.on(Events.GIT_DISABLED, function () {
    $icon.hide();
});

MainViewManager.on([
    "workingSetAdd",
    "workingSetAddList",
    "workingSetRemove",
    "workingSetRemoveList",
    "workingSetUpdate",
    "paneCreate",
    "paneDestroy"
].join(" "), function () {
    updateIconState();
});
