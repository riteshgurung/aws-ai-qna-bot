//start connection
var Promise=require('bluebird')
var bodybuilder = require('bodybuilder')
var aws=require('aws-sdk')
var url=require('url')
var _=require('lodash')
var myCredentials = new aws.EnvironmentCredentials('AWS'); 
var request=require('./request')

module.exports=function(req,res){
    console.log(req,res)
    var query=bodybuilder()
    .orQuery('nested',{
        path:'questions',
        score_mode:'sum',
        boost:2},
        q=>q.query('match','questions.q',req.question)
    )
    .orQuery('match','a',req.question)
    .orQuery('match','t',_.get(req,'session.topic',''))
    .from(0)
    .size(1)
    .build()

    console.log("ElasticSearch Query",JSON.stringify(query,null,2))
    return request({
        url:url.resolve(`https://${req._info.es.address}/${req._info.es.index}`,`${req._info.es.type}/_search?search_type=dfs_query_then_fetch`),
        method:"GET",
        body:query
    })
    .then(function(result){
        console.log("ES result:"+JSON.stringify(result,null,2))
        res.result=_.get(result,"hits.hits[0]._source")
        if(res.result){ 
            res.type="PlainText"
            console.log(res.message)
            res.message=res.result.a
            var card=_.get(res,"result.r.title") ? res.result.r : null
            
            if(card){
                res.card.send=true
                res.card.title=_.get(card,'title')
                res.card.imageUrl=_.get(card,'imageUrl')
            }

            res.session.topic=_.get(res.result,"t")

            res.session.previous={
                qid:_.get(res.result,"qid"),
                a:_.get(res.result,"a"),
                q:req.question
            }
        }else{
            res.type="PlainText"
            res.message=process.env.EMPTYMESSAGE
        }
        console.log("RESULT",JSON.stringify(req),JSON.stringify(res))
    })
}
