var content;
var config;
var vUserID;
var vUD;
var appname;
var vNewAppID;

//push config to content
$.ajax({
    url: "app/config.json",
    type: "GET",
    dataType: "json",
    success: function (data) {
        content = data;
        config = {
            host: content.config.source.host,
            prefix: content.config.source.prefix,
            port: content.config.source.port,
            isSecure: content.config.source.isSecure,
			url: content.config.source.url
        };
        appid = content.config.general.appid;
        return;
    },
    error: function (jqXHR, textStatus, errorThrown) {
        console.log(textStatus, errorThrown);
    }
}).then(function () {
    require.config({
        baseUrl: (config.isSecure ? "https://" : "http://") + config.host + (config.port ? ":" + config.port : "") + config.prefix + "resources",
        paths: {
            jquery: (config.isSecure ? "https://" : "http://") + document.location.hostname + ":" + document.location.port + "/qsa/node_modules/jquery/dist/jquery.min",
            bootstrap: (config.isSecure ? "https://" : "http://") + document.location.hostname + ":" + document.location.port + "/qsa/node_modules/bootstrap/dist/js/bootstrap.min"
        },
        shim: {
            "bootstrap": { "deps": ['jquery'] }
        }
    });
    require([
        "js/qlik", "jquery", "bootstrap"
    ],
        function (qlik, $) {
            qlik.setOnError(function (error) {
                alert(error.message);
            });

            //Get User Information from Sense
            var global = qlik.getGlobal(config);
            global.getAuthenticatedUser(function (reply) {
                //console.log(reply);
                var str = reply.qReturn.split(';');
                vUD = str[0].split('=');
                vUserID = str[1].split('=');
                $('.loader').hide();
                $('#username').append(vUD[1] + '\\' + vUserID[1]);

            });

            //Open QSA App from Sense
            var app = qlik.openApp(appid, config);
            app.unlockAll();
            app.clearAll();

            //Checkbox Filter Options
            $("#checkbox_certified").change(function () {
                if (this.checked) {
                    app.field('[TagAppName]').selectValues([{
                        qText: "Certified"
                    }], true, true);
                    app.field('[TagAppName]').lock();
                } else {
                    app.field('[TagAppName]').unlock();
                    app.field('[TagAppName]').clear();
                }
            });

            $("#checkbox_published").change(function () {
                if (this.checked) {
                    app.field('[Apps.Published]').selectValues([{
                        qText: "True"
                    }], true, true);
                    app.field('[Apps.Published]').lock();
                } else {
                    app.field('[Apps.Published]').unlock();
                    app.field('[Apps.Published]').clear();
                }
            });

            //Report Amount of Apps
            app.createGenericObject({
                TYPE: {
                    qStringExpression: "=count(distinct [ID-App_ID]) & ' App(s)'"
                },
                SELECTED: {
                    qStringExpression: "=if(isnull(GetCurrentSelections()) = -1 ,0,1)"
                }
            }, function (fields) {
                $('#amountApps').text('');
                $('#amountApps').text(fields.TYPE);
                //console.log(fields.SELECTED);
                if (fields.SELECTED = 0) {
                    $('#myResults_results').hide();
                } else {
                    if ($('#myInput_input').val().length > 0) {
                        $('#myResults_results').show();
                    } else {
                        $('#myResults_results').hide();
                    }
                }
            });

            //Sense Search Component function call
            app.model.waitForOpen.promise.then(function () {
                senseSearch.connectWithCapabilityAPI(app);
                var resultOptions = {
                    "fields": [{
                        "dimension": "App Name",
                        "suppressNull": false
                    },
                    {
                        "dimension": "Owner",
                        "suppressNull": false
                    },
                    {
                        "dimension": "Stream",
                        "suppressNull": false
                    },
                    {
                        "dimension": "[ID-App_ID]",
                        "suppressNull": false
                    },
                    {
                        "dimension": "[Apps.Published]",
                        "suppressNull": false
                    },
                    {
                        "dimension": "[Product]",
                        "suppressNull": false
                    },
                    {
                        "measure": "=chr(39) & concat(distinct [TagAppName],',') & chr(39)",
                        "label": "TagAppName",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "=chr(39) & concat(distinct [Visualization_Link],',') & chr(39)",
                        "label": "Link",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "=date(LastReloadTime,'DD.MM.YYYY')",
                        "label": "LastReloadTime",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "= chr(39) & [Description] & chr(39)",
                        "label": "DESC",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "=if( substringcount(aggr(concat({<[Dimension]=>}[Dimension],','),[ID-App_ID]),',')>= 1, substringcount(aggr(concat({<[Dimension]=>}[Dimension],','),[ID-App_ID]),',')+1,0)",
                        "label": "DIMCOUNT",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "=chr(39) & aggr(concat({<[Dimension]=>}[Dimension],','),[ID-App_ID]) & chr(39)",
                        "label": "DIMCON",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "=if( substringcount(aggr(concat({<[Measure]=>}[Measure],','),[ID-App_ID]),',')>= 1, substringcount(aggr(concat({<[Measure]=>}[Measure],','),[ID-App_ID]),',')+1,0)",
                        "label": "MESCOUNT",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "=chr(39) & aggr(concat({<[Measure]=>}[Measure],','),[ID-App_ID]) & chr(39)",
                        "label": "MESCON",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "=num(max([Size in MB]),'#,##0.00 MB')",
                        "label": "Size",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    },
                    {
                        "measure": "=chr(39) & if(count({<CP_NAME = {'" + content.config.gms.cpname + "'}>}distinct CP_Value)>0,concat({<CP_NAME = {'" + content.config.gms.cpname + "'}>}distinct CP_Value,','),0) & chr(39)",
                        "label": "CPVALUE",
                        "sortType": "qSortByNumeric",
                        "order": -1
                    }
                    ],
                    "sortOptions": {
                        "App Name": {
                            "id": "App Name",
                            "name": "App Name",
                            "order": 1,
                            "field": "App Name",
                            "sortType": "qSortByAscii"
                        }
                    },
                    "defaultSort": "App Name"
                }
                var inputOptions = {
                    "mode": "associations",
                    "searchFields": ["Owner", "Stream", "Description", "Dimension", "Measure", "App Name"],
                    "suggestFields": ["Owner", "Stream", "Description", "Dimension", "Measure", "App Name"]
                };

                senseSearch.inputs["myInput"].attach(inputOptions);
                senseSearch.results["myResults"].attach(resultOptions);
            });


            //Start SelfService Scenario
            $("body").delegate('.SelfService', 'click', function () {
                var vsourceappid = $(this).attr('appid'); //AppID from Source App   
                var vcustomproperty = $(this).attr('customproperty'); //CustomProperty from Source App
                $('#progressMondal').modal('show');
                app.createGenericObject({
                    TYPE: {
                        qStringExpression: "=concat({<[ID-App_ID] = {'" + vsourceappid + "'}>}distinct [App Name])"
                    }
                }, function (fields) {
                    appname = fields.TYPE;

                    //Post for router.route /createApp
                    var jsonBody = {
                        "user": {
                            "userid": vUserID[1],
                            "userdirectory": vUD[1]
                        },
                        "cp": vcustomproperty,
                        "app": {
                            "id": vsourceappid,
                            "name": appname
                        }
                    }

                    $.ajax({
                        type: "POST",
                        url: "https://" + document.location.hostname + ":" + document.location.port + "/qsa/createApp",
                        contentType: "application/json",
                        data: JSON.stringify(jsonBody),
                        success: function (data, status, xhr) {
                            console.log(data);

                        }
                    })
                });
            });

            $("body").delegate('.collapse_trigger', 'click', function () {
                var collapsedContainer = $(this).closest('.collapsed-description');
                var fullContainer = collapsedContainer.siblings('.collapsed-description');

                collapsedContainer.toggle();
                fullContainer.toggle();
            })

        })
})

function interact(newItems) {

    $('.turncard').on('click', function () {
        var lastChar = $(this).attr("id").replace(/\D+/g, "");
        var checkloader = 0;

        if ($('#flipper' + lastChar).hasClass('flip') === true) {
            $('#flipper' + lastChar).removeClass('flip');
        } else {
            var i = $(this).attr("id").replace(/\D+/g, "");
            var html = '';

            if (newItems[i]["Link"].html != "''") {
                checkloader = 0;
                var vlink = new Array();
                var g = newItems[i]["Link"].html.slice(1, -1);
                vlink = g.split(',');
                for (var b = 0; b <= vlink.length; b++) {
                    if (b === 0) {
                        html += "<div class='item active'><iframe src='https://" + config.host + "/single?" + vlink[b] + "&opt=nointeraction' style='width: 100%; height: 331px; border:none;'></iframe><div class='carousel-caption'></div></div>";
                    } else {
                        html += "<div class='item'><iframe src='https://" + config.host + "/single?" + vlink[b] + "&opt=nointeraction' style='width: 100%; height: 331px; border:none;'></iframe><div class='carousel-caption'></div></div>";
                    }
                }
            } else {
                html += "<div class='item active'><div style='text-align: center; top 50%; width: 100%; height: 331px; border:none;'><i class='fa fa-exclamation-triangle fa-3x' style='position: relative; top:50%;' aria-hidden='true'></i></div><div class='carousel-caption'></div></div>";
                checkloader = 1;
            }
            document.getElementById("carousel-inner" + i).innerHTML = html;
            $('#flipper' + lastChar).addClass('flip');

            if (checkloader === 0) {
                $("#loader" + i).show();
                setTimeout(function () {
                    $("#loader" + i).hide();
                }, 10000);
            }
        }
    });
};

var sidenave = 'closed';
var toggleobject;

function toggleside(x) {
    toggleobject = x;
    toggleobject.classList.toggle("change");
    if (sidenave == 'closed') {
        document.getElementById("mySidenav").style.width = "250px";
        sidenave = 'open';
    } else {
        document.getElementById("mySidenav").style.width = "0";
        sidenave = 'closed';
    }
}

//Progressbar
var progressBarContainer = $('#progress-bar');
var progressBar = {
    chain: [],
    progress: progressBarContainer.children('.progress'),
    progressBar: progressBarContainer.find('.progress-bar'),
    progressInfo: progressBarContainer.children('.progress-info'),
    set: function (value, info, noPush) {
        if (!noPush) {
            this.chain.push(value);
        }
        if (this.chain[0] == value) {
            this.go(value, info);
        } else {
            var self = this;
            setTimeout(function () {
                self.set(value, info, true)
            }, 200);
        }
    },
    go: function (value, info) {
        this.progressInfo.text(info);
        var self = this;
        var interval = setInterval(function () {
            var curr = self.progress.attr('value');
            if (curr >= value) {
                clearInterval(interval);
                self.progress.attr('value', value);
                self.progressBar.css('width', value + '%');
                self.progressBar.text(value + '%');
                self.chain.shift()
            } else {
                self.progress.attr('value', ++curr);
                self.progressBar.css('width', curr + '%');
            }
        }, 10)
    }
};

//Hide Logo
$('#myInput_input').focus(function () {
    $('.logo').slideUp();
    $('.deco1').hide();
    $('.deco2').hide();
})

//Socket.io
$.ajax({
  url: 'qsa/user',
    complete: function(data) {
    return data.responseText
  }
}).then(function(user){
    var socket = io();
    console.log(user)
    socket.emit('subscribe', user);
    socket.on('private', function (data) {
        if (data.percent == 101) {
            $('.modal-footer').append('<a role="button" class="btn btn-default" onClick="javascript:window.location.reload()" href="' + data.msg + '" target="_blank" style="float:left;">Open Application</a>');
            $('.modal-footer').append('<a role="button" class="btn btn-default" onClick="javascript:window.location.reload()" href="' + data.msg + 'datamanager/datamanager' + '" target="_blank" style="float:left;">Open Data Prep</a>');
        } else {
            progressBar.set(data.percent, data.msg);
        }
        console.log(data);
    });
});

// //Socket.io
// var socket = io();

// socket.emit('subscribe', conversation_id);

// socket.on('private', function (data) {
//     if (data.percent == 101) {
//         $('.modal-footer').append('<a role="button" class="btn btn-default" onClick="javascript:window.location.reload()" href="' + data.msg + '" target="_blank" style="float:left;">Open Application</a>');
//         $('.modal-footer').append('<a role="button" class="btn btn-default" onClick="javascript:window.location.reload()" href="' + data.msg + 'datamanager/datamanager' + '" target="_blank" style="float:left;">Open Data Prep</a>');
//     } else {
//         progressBar.set(data.percent, data.msg);
//     }
//     console.log(data);
// });

// socket.on('qsa', function (data) {
//     if (data.percent == 101) {
//         $('.modal-footer').append('<a role="button" class="btn btn-default" onClick="javascript:window.location.reload()" href="' + data.msg + '" target="_blank" style="float:left;">Open Application</a>');
//         $('.modal-footer').append('<a role="button" class="btn btn-default" onClick="javascript:window.location.reload()" href="' + data.msg + 'datamanager/datamanager' + '" target="_blank" style="float:left;">Open Data Prep</a>');
//     } else {
//         progressBar.set(data.percent, data.msg);
//     }
//     console.log(data);
// });