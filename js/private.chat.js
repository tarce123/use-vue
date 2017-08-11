/* 
* @Note: Mini页私聊模块
* @Author: liangh
* @Date:   2016-10-18
*/ 
var MINI = window.MINI || {};
        
//私聊模块
MINI.privateChat = {

	HT: null,	

    privateUser: {},//保存普通用户对象

    inforList: [],//用于保存普通用户私聊成员的信息

    privateUserXids: {},//私聊成员列表中的xids

    load: false,

    localData: {},//本地数据

    msg_num: 0,//末读信息

    sessionDataBase: {},//保存在sessoinStorge的聊天数据

    isload: false,   
    //  isInited

    isLoadTmp: false,//私聊弹框是否加载,false为没有，反之加载
    // isLoadPrivateTemplate

    xid : "",//保存用户的xid

    current_xid : "",//用于标识当前的用户xid

	defaults: {
        canSend: true //是否可发送信息
    },
	//初始化
	init: function(){
		var that = this;
        that.initPrivatePop(); 
        that.showNotice();
        that.getInfor();
        that.privatePopClose();
        that.bindEvents();
        that.initGetData();
	},

     // 初始化获取sessionData数据(仅执行一次)
    initGetData: function(){
        var that = this; 
        // init vars
        that.privateUserXids = JSON.parse(sessionStorage.getItem("privateUserXids")) || {};
        that.privateUser = JSON.parse(sessionStorage.getItem("privateUser")) || {};
        that.inforList = JSON.parse(sessionStorage.getItem("inforList")) || [];
        that.current_xid = that.privateUser.xid;
    },

     //针对助教和师显示私聊    
    isShowPrivate: function(xid,role){
        if(MT.me.xid == xid || MT.me.role === "user"){
            return "hidden";
        }else if(MINI.admin.isAdmin(role) && MINI.admin.isAdmin(MT.me.role)){
            return "show";
        }else{
            return "";
        }
    },

    //初始化弹框模板    
    initPrivatePop: function(){
        var that = this;
        var privatePopBox = template("tpl_private_pop_box");
        $("body").append(privatePopBox); 
        that.dragAndDrop();
        $(".private_chat").show();
    },

    //显示通知信息图标
    showNotice: function(){
        var that = this;
        var msg_num = JSON.parse(sessionStorage.getItem("msg_num"));
        var inforList =JSON.parse(sessionStorage.getItem("inforList"));
        if(!inforList){
            return false;
        }
        if(inforList.length>0){ 
            if(parseInt(msg_num)>0){
               $(".msg_point").show();   
            }else{
               $(".msg_point").hide();  
            } 
        }
          
    },

     //拖拽私聊框 
    dragAndDrop:function() {
        var _move = false;
        //鼠标离控件左上角的相对位置 
        var _x,
            _y;
        $(".private_head").mousedown(function(e) { 
            _move = true;
            _x = e.pageX-parseInt($(".private_pop_box").css("left")); 
            _y = e.pageY-parseInt($(".private_pop_box").css("top")); 
        }); 
        $(document).mousemove(function(e) {
            if(_move){ 
              var x = e.pageX-_x;//移动时鼠标位置计算控件左上角的绝对位置 
              var y = e.pageY-_y; 
              $(".private_pop_box").css({top:y,left:x});//控件新位置 
            } 
        }).mouseup(function() { 
          _move = false; 
        }); 
    },

    //判断私聊的用户是否已在列表中
    isRepateMember: function(xid){    
        var that = this;  
        
        // console.warn("isRepateMembert:===>", that.privateUserXids, that.privateUser);

        // 发起／接收 => 通过 `that.privateUser`  => 读取当前用户数据,且保存session
        /*alert("====="+that.privateUserXids[xid]);*/
        if(!that.privateUserXids[that.privateUser.xid]){
            
            that.privateUserXids[that.privateUser.xid] = that.privateUser.xid;
            that.inforList.push(that.privateUser);
            sessionStorage.setItem("privateUserXids", JSON.stringify(that.privateUserXids));
            sessionStorage.setItem("inforList", JSON.stringify(that.inforList));

            // console.warn(that.inforList);

            // 初始化渲染聊天用户列表
            that.renderPrivateUserList(that.privateUser);

        }else{
            that.showDialog(that.privateUser);    
        }  

        // 设置当前用户
        sessionStorage.setItem("privateUser", JSON.stringify(that.privateUser));

        //选择与之私聊的用户
        that.selectUserChat();

        that.delHideShow();

        // 关闭具体聊天窗口
        if(!that.isLoadDelMember){
            that.delMember();
            that.isLoadDelMember = true;
        }
        

    },

    //显示删除的图标
    delHideShow: function(){
        var $listLi = $("#chat_user_list li");
        $listLi.on("mouseover",function(){
           $listLi.find("i").hide();
           var  xid = $(this).data("xid");
           $("#del_"+xid).show();
        });
        $listLi.on("mouseout",function(){
           $listLi.find("i").hide();
           var  xid = $(this).data("xid");
           $("#del_"+xid).hide();
        });
    },

    //删除成员
    delMember: function(){
        var $listLi = $("#chat_user_list"),
            $obj =  "",
            num = $("#chat_user_list li").size(),
            xid = 0;

        $listLi.on("click", "li i", function(e){

                e.stopPropagation();

                // 删除元素 & reload
                var xid = $(this).parent("li").data("xid"),
                    rmIndex = $("#u_"+xid).index();
                
                $("#u_"+xid).remove();

                var countEls = $("#chat_user_list li").size(),
                    lis = $("#chat_user_list li");

                // console.warn("被删除当前:"+rmIndex, "列表剩余元素"+countEls, "选中==>"+(rmIndex - 1));
                // that.reloadChatMsg($obj);

                var $curLi = null;
                // 选中上一个元素
                if(countEls > 0){
                    // 首个被删, 选中第一项
                    if(rmIndex === 0){
                        $curLi = lis.eq(0);
                    }
                    // 选中上一项
                    else{
                        $curLi = lis.eq(rmIndex - 1);
                    }
                    $curLi.addClass("cur");
                    $("#private_head .user_name").html($curLi.find("a").html());
                    
                    // 重载当前选中聊天数据
                    that.reloadChatMsg($curLi);
                }else{
                    $("#private_pop_box").hide();
                }

            // }

             // 删除sessionStorge中的`privateUserXids`数据
            if(that.privateUserXids[xid]){
                delete that.privateUserXids[xid];
            }  
            for(var i = 0; i< that.inforList.length;i++){
                if(that.inforList[i].xid == xid){
                    that.inforList.splice(i,1); 
                }
            }
            sessionStorage.setItem("privateUserXids", JSON.stringify(that.privateUserXids));
            sessionStorage.setItem("inforList", JSON.stringify(that.inforList));      
        })

       
    },

    //显示对话框
    showDialog: function(userInfor){
        var that = this,
            tmp = "";                                           
        var inforList = that.inforList; 
        $("#chat_user_list").empty(); 
        that.inforList.sort();
        for(var i = 0; i<inforList.length;i++){
            tmp += template("tpl_user_list",that.memberTmp(inforList[i]));
        }   
        $("#chat_user_list").append(tmp);
        $("#chat_user_list li").removeClass("cur");
        $("#u_"+userInfor.xid).addClass("cur");
        $("#u_"+userInfor.xid).insertBefore($("#chat_user_list li:first"));
        $("#private_head .user_name").html(userInfor.nickname);
    },


    getInfor: function(){
         var that = this;
         
         var chatMsg = JSON.parse(sessionStorage.getItem("chatMsg")); 

         that.sessionDataBase = chatMsg; 
        
         for(var key in that.sessionDataBase){

            if(!that.localData[key]){

                that.localData[key] = []; //Array
                that.localData[key] = that.sessionDataBase[key]; //Object
            }
         };

    },

    //存储用户的信息
    saveInfor: function(res){
        var that = this,
            xid = that.current_xid;    
        
        // todo..
        if(res.xid){
            xid = res.xid;
        }

        // todo...
        if(!that.localData[xid]){
            that.localData[xid] = [];
        }
        that.localData[xid].push(res);
        
        // 设置索引
        if (!that.privateUserXids){
            that.privateUserXids = {};
        }

        // 保存 ｀inforList｀
        if(!that.privateUserXids[that.xid]){
            that.privateUserXids[that.xid] = that.privateUser.xid;
            that.inforList.push(that.privateUser);
        }
       
        // 写入 => sessionStorage
        sessionStorage.setItem("chatMsg", JSON.stringify(that.localData));
        sessionStorage.setItem("privateUserXids", JSON.stringify(that.privateUserXids));
        sessionStorage.setItem("inforList", JSON.stringify(that.inforList));
        sessionStorage.setItem("privateUser", JSON.stringify(that.privateUser));
    },
    

    //加载对应的聊天信息
    reloadChatMsg: function($obj){
        $("#private_chat_msg").empty(); 
        var that = this;
        var tmp= "";

        var chatMsg = JSON.parse(sessionStorage.getItem("chatMsg"));
        var  xid = $obj.data("xid");
        if(chatMsg == null){
            return false;
        }
        var chatMsgList = chatMsg[xid];
        if(chatMsgList == undefined){
            return;
        }
        that.current_xid = xid;
        for (var i = 0; i < chatMsgList.length; i++) {
               tmp+= template("tpl_chat_msg",chatMsgList[i]);
        }    
        $("#private_chat_msg").append(tmp);  

        $("#private_chat_domain").scrollTop($("#private_chat_msg").height());
    },



    //新增私聊成员到列表中
    renderPrivateUserList: function(userInfor){
        var that = this,
            tmp = "";   
        var userData={
            d:  userInfor
        }   
        tmp = template("tpl_user_list",userData);
        $("#chat_user_list").prepend(tmp);
        $("#chat_user_list li").removeClass("cur");
         $("#private_head .user_name").html("");
        $("#private_head .user_name").html(userInfor.nickname);
        $("#u_"+userInfor.xid).addClass("cur");
        $("#private_chat_msg").empty(); 
    },

    //私聊用户列表模板
    memberTmp: function(data){
        var d= "";
        var userData={
            d:  data
        }
        return userData;
    },

    //显示私聊弹框
    privatePopShow: function(xid){
        var that=  this;

        that.xid = xid;
        $(".arrow_comm").hide();
        $(".private_pop_box").show(); 
        that.msg_num == 0;
        sessionStorage.setItem("msg_num",that.msg_num); 
        
        that.current_xid = xid;
        that.isRepateMember(xid);

        var inforList = that.inforList; 
        if(inforList.length>0){
            that.reloadChatMsg($("#u_"+xid));
        }
    },

    //关闭私聊弹框
    privatePopClose: function(){
        var $closePop = $("body .close_pop"),
            $privatePopBox = $("#private_pop_box");
        
        $closePop.on("click",function(){
            $privatePopBox.hide();
        });
    },

    //接收聊天信息
    receiveChat: function(res){
        var that = this;
         // 表情替换{表情包 key: value, 聊天内容}
        var renderMsg = MINI.tools.ubb2img(window.HT_EMOTIONS_PACKAGE,res.msg);
        
        var chatMsg = "",
            d = "";
        chatMsg = {
            d : res,
            xid: res.xid,
            me_xid: MT.me.xid,
            time : MINI.tools.convertTimestamp(res.time),
            msg : renderMsg
        }

        var infor= {
                xid: res.xid,
                nickname: res.nickname
            }
        // 当前私聊用户
        that.privateUser = infor;

        /*var userXids =JSON.parse(sessionStorage.getItem("privateUserXid"));
        if (userXids == null) {
            userXids = {};
        }
        if(!userXids[res.xid]){
            that.privateUser[res.xid] = res.xid;
            that.userList.push(userObj);
            sessionStorage.setItem("userList",JSON.stringify(that.userList));
            sessionStorage.setItem("privateUserXid",JSON.stringify(that.privateUser));
        }        
        sessionStorage.setItem("userObj", JSON.stringify(userObj));*/

        
        //私聊弹框没有显示出来的情况下
        if($("#private_pop_box").is(":hidden")){
            that.msg_num++;
            sessionStorage.setItem("msg_num",that.msg_num); 
            $(".msg_point").show();
            $("#mod_chat_post .msg_point").show();
            $("#mod_chat_post .msg_point").html(that.msg_num);
        }else{
            var privateUserXids = that.privateUserXids;//JSON.parse(sessionStorage.getItem("privateUserXids"));
            if(!privateUserXids[res.xid]){
              /*  that.privateUserXids[res.xid] = res.xid;*/
                that.msg_num++;
                $("#mod_chat_post .msg_num").show();
                $(".msg_point").show();
            }
        }    
        var r_xid = $("#chat_user_list .cur").data("xid");

        //正和当前用户对话
        if(r_xid == res.xid){
            var  chatMsgTmp = template("tpl_chat_msg",chatMsg); 
            $("#private_chat_msg").append(chatMsgTmp);
        }else{
            $("#ts_"+res.xid).show();
        }
        that.xid = res.xid;
        $("#nav_guide .private_chat").show();
        $("#private_chat_domain").scrollTop($("#private_chat_msg").height());
        that.saveInfor(chatMsg);
    },


    //点击私聊框左边栏选择与之私聊的用户
    selectUserChat: function(){
        var that = this,
            $chatUser = $("#chat_user_list li");
        $chatUser.on("click",function(){
            $chatUser.removeClass("cur");
            var xid = $(this).data("xid");
            $("#u_"+xid).addClass("cur");
            $("#private_head .user_name").text($(this).find("a").html());
            that.current_xid = xid;
            if($("#u_"+xid).hasClass("cur")){
                $("#ts_"+xid).hide();
            }
            that.reloadChatMsg($(this));
        });
    },

	// 事件绑定
	bindEvents: function(){
		var that = this,
			__Event = "click", 
			$privateSendInfo = $("#private_send_info"),
            $privatePopBox = $("#private_pop_box"),
            $closePop = $("body .close_pop"),
            $private_nav =  $("#nav_guide .private_chat"),
			$privateSendBtn = $(".private_send_btn");

		// 发送聊天(回车事件)
	    $privateSendInfo.on("keydown", function(e) {
	        if(e.keyCode === 13){
	            that.privatePost();
	            e.preventDefault();
	            return false;
	        }
	    });
	    // 发送聊天(点击按钮)
	    $privateSendBtn.on(__Event, function(){
	        that.privatePost();
	    });	


        //关闭提示框
        $(".private_con").on("click",".close",function(){
            $(".private_con").hide();
        });
        //点击导航私聊弹出框
        $private_nav.on("click",function(){
            var inforList = that.inforList;
            clearInterval(MINI.admin.vote.voteTimeUpdate);
            clearInterval(MINI.admin.callName.defaluts.callBackRequest);
            clearInterval(MINI.admin.callName.defaluts.recordTimer)
            sessionStorage.setItem("msg_num",0);
            if(inforList.length == 0){
               $(".private_con").show();
               return false;
            }
            else if(inforList.length>0){
                var msg_num = sessionStorage.getItem("msg_num"); 
                if(!msg_num){
                    that.privatePopShow(inforList.xid);
                    return;
                }     
                $(".arrow_comm").hide();
                that.isRepateMember();
                $(".msg_point").hide();
                $("#chat_user_list li").removeClass("cur");
                $("#chat_user_list li:first").addClass("cur");
                var $this = $("#chat_user_list li:first");
                that.reloadChatMsg($this);
                $(".private_pop_box").show();
            }else{
                $(".private_pop_box").hide();
            } 
        });
	},

	//私聊信息发送
	privatePost: function(){
		var that = this,
            action = MT.getLiveState(),
            $chatCon = $("#private_send_info"),
            $chatVal = $.trim($chatCon.val());
                  
        // 禁止为空
        if($chatVal.length === 0){
            MINI.tools.showComtip($chatCon,"请输入内容...");
            return false;
        }

        //直播末开始禁止私聊
        if(action != "start"){
            MINI.tools.showComtip($chatCon,"直播尚未开启，暂时无法私聊!");
            return false;
        }
        // 过滤回车
        $chatCon.val($chatVal.replace(/\r/g, ""));
        // 检查字数
        if(MINI.tools.charLength($chatVal) > 150){
            MINI.tools.showComtip($chatCon, "不能超过150个字符");
            return false;
        }
        $chatCon.focus();

          
        //发送聊天信息  
        that.HT.emit("chat:private",{xid:that.current_xid, msg:$chatVal}, function(res){
            
            if(res.code === 0){
                $chatCon.val("");
                that.privateChatTmp(res);           
            }else{
                MINI.tools.showComtip($chatCon,res.msg);
            }
            that.defaults.canSend = false;
            setTimeout(function(){
                that.defaults.canSend = true;
            }, that.defaults.sendTimeLimit);
        });
	},


    //加载聊天模板
    privateChatTmp: function(res){
        var that =  this;
        var renderMsg = MINI.tools.ubb2img(window.HT_EMOTIONS_PACKAGE,res.data.msg);
        var chatMsg = "",
            d = "";
        chatMsg = {
            d : res.data,
           /* xid: res.xid,*/
            me_xid: MT.me.xid,
            time : MINI.tools.convertTimestamp(res.data.time),
            msg : renderMsg
        }
        
        that.saveInfor(chatMsg);

        var  chatMsgTmp = template("tpl_chat_msg",chatMsg); 
        $("#private_chat_msg").append(chatMsgTmp);
        $("#nav_guide .private_chat").show();
        $("#private_chat_domain").scrollTop($("#private_chat_msg").height());
    }

}



 