const mongoose = require('mongoose');
const Bid = require('../models/Bid');
const Task = require('../models/Task');
const {Conversation,Message} = require('../models/Message');
const fail = (status,message) => {throw Object.assign(new Error(message),{status});};
async function transaction(work) {
 const session=await mongoose.startSession();
 try {let result; await session.withTransaction(async()=>{result=await work(session);});return result;} finally {await session.endSession();}
}
exports.createBid=async(req,res)=>{
 try {
  const {taskId,message}=req.body, amount=Number(req.body.amount), days=Number(req.body.proposedTimeline);
  if(!mongoose.isValidObjectId(taskId)||!Number.isFinite(amount)||amount<=0||!Number.isInteger(days)||days<1||typeof message!=='string'||!message.trim()||message.length>1000) return res.status(400).json({message:'Enter a valid task, positive amount, delivery days and proposal.'});
  const bid=await transaction(async session=>{
   const task=await Task.findById(taskId).session(session);
   if(!task)fail(404,'Task not found');
   if(String(task.clientId)===String(req.user._id))fail(400,'You cannot bid on your own task');
   if(task.status!=='open'||task.biddingType!=='open'||task.currentBidCount>=task.maxBids||(task.biddingEndsAt&&task.biddingEndsAt<=new Date()))fail(400,'This task is not accepting proposals');
   if(await Bid.exists({taskId,bidderId:req.user._id}).session(session))fail(400,'You have already submitted a proposal');
   const [bid]=await Bid.create([{taskId,bidderId:req.user._id,amount,message:message.trim(),proposedTimeline:days}],{session});
   task.currentBidCount+=1;await task.save({session});
   await Conversation.create([{participants:[task.clientId,req.user._id],taskId,bidId:bid._id,title:`Bid discussion for: ${task.title}`}],{session});
   return bid;
  });
  res.status(201).json({bid});
 }catch(error){res.status(error.status|| (error.code===11000?409:500)).json({message:error.status?error.message:error.code===11000?'Proposal already exists':'Could not submit proposal. Please try again.'});}
};
exports.acceptBid=async(req,res)=>{
 try{
  if(!mongoose.isValidObjectId(req.params.bidId))return res.status(400).json({message:'Invalid proposal'});
  const result=await transaction(async session=>{
   const bid=await Bid.findById(req.params.bidId).session(session);if(!bid)fail(404,'Proposal not found');
   const task=await Task.findById(bid.taskId).session(session);if(!task)fail(404,'Task not found');
   if(String(task.clientId)!==String(req.user._id))fail(403,'Only the task owner can accept proposals');
   if(task.status!=='open'||bid.status!=='pending')fail(409,'This task or proposal has already changed');
   if(bid.counterOffers.some(offer=>offer.status==='pending'))fail(400,'Respond to the pending price offer first');
   task.status='in-progress';task.selectedBidId=bid._id;task.selectedFreelancerId=bid.bidderId;task.selectedAt=new Date();await task.save({session});
   bid.status='accepted';bid.acceptedAt=new Date();await bid.save({session});
   await Bid.updateMany({taskId:task._id,_id:{$ne:bid._id},status:'pending'},{$set:{status:'rejected',rejectedAt:new Date()}},{session});
   let conversation=await Conversation.findOne({bidId:bid._id}).session(session);
   if(!conversation){[conversation]=await Conversation.create([{participants:[task.clientId,bid.bidderId],taskId:task._id,bidId:bid._id,title:`Discussion: ${task.title}`}],{session});}
   const [message]=await Message.create([{conversationId:conversation._id,senderId:req.user._id,receiverId:bid.bidderId,message:'Your proposal has been accepted.',messageType:'system',isSystemMessage:true,systemMessageType:'bid_accepted'}],{session});
   conversation.lastMessage=message._id;conversation.lastMessageAt=message.createdAt;await conversation.save({session});
   return {bid,task,conversationId:conversation._id};
  });res.json(result);
 }catch(error){res.status(error.status||500).json({message:error.status?error.message:'Could not accept proposal. Please try again.'});}
};
