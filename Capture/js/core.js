'use strict';
$(function () {
    $("#startButton").click(captureScreen);
});

async function captureScreen() {
    var html = "";
    $('#modalDialog').modal({overlayClose:false});

    var vidElement = $("#vidCapture")[0];
    vidElement.muted = true;
    var voiceStream = null;
    if (confirm("Record microphone too?")) {
        try {
            voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        catch { } //user did not permit the mic
    }

    navigator.mediaDevices.getDisplayMedia({ video: true }).then(function (stream) {
        if (voiceStream)
            voiceStream.getAudioTracks().forEach(t => stream.addTrack(t));

        var chunks = [];
        var recording = null;
        var started = true;

        vidElement.srcObject = stream; //connect stream to the video element

        $("#btnStopCapture").show();

        var mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
        mediaRecorder.addEventListener('dataavailable', function(event) {
            if (event.data && event.data.size > 0) {
                chunks.push(event.data);
            }
        });

        function stopCapture() {
            if (!started) return; //to prevent calling twice
            started = false;
            mediaRecorder.stop();
            stream.getTracks().forEach(function (track) { track.stop(); });
            if (voiceStream) {
                vidElement.muted = false;
                voiceStream.getTracks().forEach(function (track) { track.stop(); });
                voiceStream = null;
            }
        }

        mediaRecorder.onstop = function(e) {
               var blob = new Blob(chunks, { type: 'video/webm' });
            recording = window.URL.createObjectURL(blob);

            vidObjectCleanup();
            vidElement.src = recording;
            vidElement.load();

            blob.lastModifiedDate = new Date(); //https://stackoverflow.com/a/29390393/56621
            blob.name = 'video.webm';

            $("#btnStopCapture").hide();
            $('#btnCancelCapture').show().click(function () {
                $.modal.close();
                vidObjectCleanup();
                URL.revokeObjectURL($('#btnDownloadCapture')[0].href);
                $("#modalDialog a").hide();
                blob = null;
            });
            $('#btnDownloadCapture').show().attr('href', URL.createObjectURL(blob));
            $('#btnImgur').show().click(function () {
                SaveToImgur(blob);
            });
            $('#btnFileIo').show().click(function () {
                SaveToFileio(blob);
            });
            $('#btnDropbox').show().click(function () {
                SaveToFileio(blob, function (url) {
                    Dropbox.save(url, 'video.webm', {});
                });
            });
        }

        function vidObjectCleanup() {
            vidElement.pause();
            vidElement.srcObject = null;
            vidElement.removeAttribute('src'); // empty source
            vidElement.load();
        }

        stream.addEventListener('inactive', stopCapture);
        $("#btnStopCapture").click(stopCapture);

        mediaRecorder.start(10);
    }).catch(function () {
        $.modal.close(); return;
    });
}