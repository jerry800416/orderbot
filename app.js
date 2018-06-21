// require 方法導入restify 套件(npm安裝的套件才可以直接打名稱，若是第三方下載的套件必須給路徑)
// restify : web server Framework
var restify = require('restify');
// botbuilder : chatbot Framwork
var builder = require('botbuilder');
// 建立server 端
var server = restify.createServer();
// 指定port3978
server.listen(process.env.port || process.env.PORT || "3978",function(){
    // 成功進入console.log()
    console.log('%s listening to %s',server.name,server.url);
});
// 建立微軟連線帳密
var connector = new builder.ChatConnector({
    appId:process.env.MicrosoftAppId,
    appPassword:process.env.MicrosoftAppPassword
});
server.post('/api/messages',connector.listen());

// 導入menuConfig.json檔案,裡面包含菜單及價格
var menu = require("./menuConfig.json");
// 導入大選單丟到變數mainMenu
var mainMenu = menu.main;
// 導入飲料選單丟到drinkMenu
var drinkMenu = menu.drink;
// 導入餐點選單丟到foodMenu
var foodMenu = menu.food;
// 定義一個變數給suggestedmsg使用
var session;
// 定義一個suggestedActions丟到變數suggestedmsg
var suggestedmsg = new builder.Message(session).suggestedActions(builder.SuggestedActions.create(
    session,[
        // (session,value,key) 
        // imback 會顯示在對話框中
        builder.CardAction.imBack(session,"訂餐點","訂餐點"),
        builder.CardAction.imBack(session,"結帳","結帳")
    ]
));
// 定義一個suggestedActions丟到變數suggestedmsg2
var suggestedmsg2 = new builder.Message(session).suggestedActions(builder.SuggestedActions.create(
    session,[
        // (session,value,key) 
        // imback 會顯示在對話框中
        builder.CardAction.imBack(session,"訂飲料","訂飲料"),
        builder.CardAction.imBack(session,"結帳","結帳")
    ]
));

// 聊天機器人開始
var bot = new builder.UniversalBot(connector,[
    function(session){
    session.send('歡迎光臨瑞昌小館');
    // 從mainMenu這個Dialog做起始
    session.beginDialog('mainMenu');
    }
]);


//流程選單
bot.dialog('mainMenu',[
    // 給一個參數開關args判定是否有訂單在購物車
    function(session,args){
        var promptText;
        // 要先判定args再判定args.reprompt,因為若是args沒有賦值,會直接報錯
        if(args && args.reprompt){
            var promptText = '請問您要再點些什麼?'
        }else{
            var promptText = '請問您要點什麼?'
            // 初始化conversationData(資料會在對話結束才消失)
            session.conversationData.orders = new Array();
        };
        // chice的個參數(session,選單的說明(顯示在選單之前),選單(可以是陣列、物件、字串),選單的顯示形式)
        builder.Prompts.choice(session,promptText,mainMenu,{listStyle:builder.ListStyle.button});
    },
    function(session,results){
        // 如果點選結帳，轉到checkOut..,用replaceDialog是因為只跑一次,不再進入mainMenu迴圈
            session.replaceDialog(mainMenu[results.response.entity])
    }
]);


// 飲料選單
bot.dialog('drinkMenu',function(session){
    // 建立新的message物件
    var msg = new builder.Message(session)
    // 建立attachmentLayout方法設定message物件以carousel(橫向捲動)方式呈現,另有List(直向一列)方式 =>較推薦carousel
    msg.attachmentLayout(builder.AttachmentLayout.carousel);
    // 建立heroCards變數並設定成array格式
    var heroCards = new Array();
    // 將menuConfig.json裡的drink裡的array裡的物件讀出(使用foreach迴圈)
    drinkMenu.forEach(drink => {
        var buttons = new Array();
        // 將menuConfig.json裡的drink.specs(size&price)裡的array裡的物件讀出(使用foreach迴圈)
        drink.specs.forEach(spec =>{
            var postBackValue = {
                // addDrinkToCart => 飲料購物車
                dialog:"addDrinkToCart",
                // 將foreach跑出的drink的資料丟到drink這個array裡面
                drink:{
                    "name":drink.name,
                    "size":spec.name,
                    "prices":spec.prices
                }
            }
            // 不將button數量寫死,放在foreach迴圈裡面,較彈性
            // postback 不會顯示在對話框中
        var button = builder.CardAction.postBack(
            // postBackValue =>選項的value放在前面 要顯示再按鈕上的文字放在後面
            session,JSON.stringify(postBackValue),`${spec.name}-$${spec.prices}`
        );
        // 將button 存入 buttons的array裡面
        buttons.push(button);
        });
        // new 一個heroCard
        var heroCard = new builder.HeroCard(session)
                        // 取出drink array裡面的資料
                        .title(drink.name)
                        .images([builder.CardImage.create(session,drink.picture)]) 
                        .buttons(buttons);
        // 將heroCard變數的資料存進heroCards
        heroCards.push(heroCard);
    });
    // 將heroCards資料存進msg裡面
    msg.attachments(heroCards);
    // 建立兩個SuggestedActions 
    msg.suggestedActions(builder.SuggestedActions.create(
        session,[
            // (session,value,key) 
            // imback 會顯示在對話框中
            builder.CardAction.imBack(session,"訂餐點","訂餐點"),
            builder.CardAction.imBack(session,"結帳","結帳")
        ]
    ));
    // 結束Dialog並送出msg
    session.endDialog(msg);
// triggerAction比對如果key是訂飲料才顯示飲料選單
}).triggerAction({matches:/^訂飲料$/});


// 餐點選單
bot.dialog('foodMenu',function(session){
    var msg = new builder.Message(session)
    msg.attachmentLayout(builder.AttachmentLayout.carousel);
    var heroCards = new Array();
    foodMenu.forEach(food => {
            var postBackValue = {
                dialog:"addFoodToCart",
                food:{
                    "name":food.name,
                    "prices":food.prices
                }
            }
        var heroCard = new builder.HeroCard(session)
                        .title(food.name)
                        .subtitle(`$${food.prices}`)
                        .images([builder.CardImage.create(session,food.picture)]) 
                        // 因為單一品項沒有多個規格可以選,故按鈕直接寫死
                        .buttons([
                            new builder.CardAction.postBack(
                                session,JSON.stringify(postBackValue),"購買"
                            )
                        ]);
        heroCards.push(heroCard);
    });
    msg.attachments(heroCards);
    msg.suggestedActions(builder.SuggestedActions.create(
        session,[
            builder.CardAction.imBack(session,"訂飲料","訂飲料"),
            builder.CardAction.imBack(session,"結帳","結帳")
        ]
    ));
    session.endDialog(msg);
}).triggerAction({matches:/^訂餐點$/});


// 飲料order
bot.dialog("addDrinkToCart",[
    function(session){
        // 利用JSON.parse方法將資料轉成JSON物件
        var drink = JSON.parse(session.message.text).drink;
        // 將Json檔吐的資料分別讀出並以KEY:VALUE形式再存進dialogData的order裡面
        var order = session.dialogData.order = {
            // 多給一個key =>item 方便之後判定使用
            item:'drink',
            drinkName:drink.name,
            drinkSize:drink.size,
            drinkPrices:drink.prices
        }
        builder.Prompts.number(session,`請問<${order.drinkName}>${order.drinkSize}要訂多少杯?`);
        session.send(suggestedmsg)
    },
    function(session,results){
        session.dialogData.order.drinkNumber = results.response;
        builder.Prompts.choice(session,`請問飲料冰熱?`,["正常冰","少冰","微冰","去冰","溫飲","熱飲"],{listStyle:builder.ListStyle.button}); 
        session.send(suggestedmsg)
    },
    function(session,results){
        // choice方法要用response.entity才能轉換成dialogData可以儲存的格式
        session.dialogData.order.drinkHotOrIce = results.response.entity;
        builder.Prompts.choice(session,`請問飲料甜度?`,["全糖","少糖","半糖","微糖","無糖"],{listStyle:builder.ListStyle.button});
        session.send(suggestedmsg)
    },
    function(session,results){
        session.dialogData.order.drinkSweetness = results.response.entity;
         //將之前dialogData的資料讀出丟到變數order裡面
        var order = session.dialogData.order
        // 計算飲料單價*杯數
        var total = order.drinkPrices * order.drinkNumber;
        var orderDetail = `${order.drinkName} ${order.drinkHotOrIce} ${order.drinkSweetness} x ${order.drinkNumber}杯 共$${total}元\n`
        session.send(`您剛剛共點了:\n${orderDetail}`);
        // 將order的資料儲存到conversationData裡面,避免dialogData結束資料消失
        session.conversationData.orders.push(order);
        // 返回主選單
        session.replaceDialog('mainMenu',{reprompt:true});
    }
]).triggerAction({matches:/^{"dialog":"addDrinkToCart".*/});


// 餐點order
bot.dialog("addFoodToCart",[
    function(session){
        var food = JSON.parse(session.message.text).food;
        var order = session.dialogData.order = {
            item:'food',
            foodName:food.name,
            foodPrices:food.prices
        }
        builder.Prompts.number(session,`請問<${order.foodName}>要訂幾份?`);
        session.send(suggestedmsg2)
    },
    function(session,results){
        var order = session.dialogData.order
        order.foodNumber = results.response;
        var total = order.foodPrices * order.foodNumber;
        var orderDetail = `${order.foodName} x ${order.foodNumber}份 共$${total}元\n`
        session.send(`您剛剛共點了:\n${orderDetail}`);
        session.conversationData.orders.push(order);
        session.replaceDialog('mainMenu',{reprompt:true});
    }
]).triggerAction({matches:/^{"dialog":"addFoodToCart".*/});


//運送資訊 
bot.dialog('shipments',[
    function(session){
        session.dialogData.shipments = {};
        builder.Prompts.text(session,"請問您的姓名?");
    },
    function(session,results){
        session.dialogData.shipments.name = results.response;
        builder.Prompts.text(session,"請問連絡電話?");
    },
    function(session,results){
        session.dialogData.shipments.tel = results.response;
        builder.Prompts.text(session,"請問要外送的地址?");
    },
    function askTime(session,results){
        session.dialogData.shipments.address = results.response;
        builder.Prompts.time(session,"請問要外送的時間?");
        // session.dialogData.
        // beginDialog(determination);
    },
    function(session,results){
        var response = results.response;
        
        a = builder.EntityRecognizer.resolveTime([response]).toString().substring(0,11)
        b = new Date().toString().substring(0,11)
        if(a == b){
        // 轉換時間物件，chrono支援中文
        session.dialogData.shipments.time = builder.EntityRecognizer.resolveTime([response]).toString().split("G")[0].substring(15,25);
        // console.log(session.dialogData.shipments.time);
        // console.log(a.toString());
        // console.log(typeof a);
        // console.log(b.toString());
        // console.log(typeof b);
        session.endDialogWithResult({
            response:session.dialogData.shipments
        })
        }else{
            session.send("不能跨日訂購喔!請重新輸入寄送資訊")
            session.replaceDialog('shipments')
        }
    },
]);

//判定時間
// bot.dialog('determination',[
//     function(session){
//         session.endDialogWithResult({

//         })
//     }
// ])


// 檢查購物車&結帳
bot.dialog('checkOut',[
    function(session){
        if(session.conversationData.orders.length > 0){
            session.beginDialog("shipments");
        }else{
            session.send('您的購物車沒有東西喔');
            session.replaceDialog("mainMenu",{reprompt:false});
        }
    },
    function(session,results){
        var shipment = results.response;
        var orders = session.conversationData.orders;
        var msg = new builder.Message(session);
        var items = [];
        var total = 0 ;

        orders.forEach(order => {
            if(order.item =="drink"){
                var subtotal = order.drinkPrices * order.drinkNumber;
                var item = builder.ReceiptItem.create(
                    session,`$${subtotal}`,`${order.drinkName}x${order.drinkNumber}${order.drinkSize}`
                ).subtitle(
                    `${order.drinkHotOrIce}${order.drinkSweetness}`
                );
                items.push(item);
                total += subtotal;
            }else if(order.item == "food"){
                var subtotal = order.foodPrices * order.foodNumber;
                var item = builder.ReceiptItem.create(
                    session,`$${subtotal}`,`${order.foodName}x${order.foodNumber}份`
                );
                items.push(item);
                total += subtotal;
            }
        });
        var receipt = new builder.ReceiptCard(session)
        .title("您的訂單明細:") 
        .facts([
            builder.Fact.create(session,shipment.name,"訂購人姓名"),
            builder.Fact.create(session,shipment.tel,"訂購人電話"),
            builder.Fact.create(session,shipment.address,"配送地址"),
            builder.Fact.create(session,shipment.time,"配送時間"),
        ])
        // .items品項
        .items(items)
        .total(`$${total}`)
    // receipt 資料丟到msg變數
    msg.addAttachment(receipt);
    //顯示msg內容並結束對話
    session.send(msg)
    session.endConversation("您的訂單以發送,感謝您的光臨");
    // session.replaceDialog("mainMenu",{reprompt:false});
    }
]).triggerAction({matches:/^結帳$/});