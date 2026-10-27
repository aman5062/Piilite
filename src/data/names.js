// Compact Indian name dictionary used by the rule-based name finder.
// All lowercase. Not exhaustive on purpose: triggers ("my name is", "Shri",
// "S/O" ...) catch names that are not in these lists.

export const FIRST_NAMES = new Set(`
aarav aarush aayush abhay abhijeet abhijit abhinav abhishek aditya adil afzal ajay ajit akash akhil akshay alok
aman amit amitabh amol anand anant aniket anil anirudh ankit ankur anmol anoop anshul anuj anup anurag arijit
arjun arnav arun arvind ashish ashok ashutosh ashwin atul avinash ayaan ayush azhar balaji bharat bhavesh bhushan
chetan chirag darshan deepesh devendra dhananjay dharmendra dheeraj dhruv dilip dinesh gaurav girish gopal govind
gurpreet harish harsh harshit hemant himanshu hitesh imran irfan ishaan jagdish jatin jayant jayesh jitendra karan
kartik kaushik keshav kishore krishnan kunal lalit lokesh madhav mahesh manish manoj mayank mihir mohit mohan mukesh
mukul nachiket nadeem naman narendra naresh naveen navin neeraj nikhil nilesh niraj nishant nitin nitesh omkar
pankaj paras parth pavan pawan piyush pradeep prakash pramod pranav prasad prashant prateek pratik praveen
prithvi pritam puneet rahul rajat rajeev rajendra rajesh rajiv rakesh ramesh ranjit ravi rishabh rishi ritesh
rohan rohit sachin sahil sai sameer samir sandeep sanjay sanjeev santosh sarthak satish saurabh shailesh shankar
shantanu sharad shashank shekhar shivam shreyas shubham siddharth siddhant sohail somnath subhash sudhir sujit
sumit sunil suraj suresh sushant swapnil tarun tushar uday umesh utkarsh vaibhav varun vedant vicky vijay vikas
vikram vinay vineet vinod vipin vishal vishnu vivek yash yashwant yogesh yuvraj zubair mohd mohammad mohammed
muhammad md abdul ahmad ahmed arif asif faisal farhan iqbal javed junaid kamran khalid mujeeb nasir rizwan
salman shahid shakeel shoaib tariq wasim yusuf zaid zakir aslam salim sajid rashid harpreet jaspreet manpreet
simranjeet gurdeep jaswinder kuldeep navdeep rajinder sukhwinder balwinder hardeep amandeep lovepreet
murali senthil karthik karthikeyan arumugam balu ganesan murugesan ramasamy saravanan selvaraj sivakumar
venkat venkatesh srinivas srinivasan sudhakar suresh raghav raghavendra ramana nagaraj manjunath basavaraj
chandrashekhar anoop biju shibu sreejith sreekanth subin vineeth jibin jithin arnab sourav soumya subhajit
debashish debasis partha pritam sayan sudip suman tanmay indranil anirban abhirup
aarti aditi aishwarya akanksha alka amrita ananya anita anjali ankita anu anupama anushka aparna archana
arpita arti bhavana bhavna chitra deepa deepika deepti devika divya diya gauri harshita isha ishita jaya
jyoti kajal kalpana kamala kavita kavya khushi komal kriti lata madhuri mamta manisha mansi meena meenakshi
megha meghna monika nandini neelam neha nidhi nikita nisha nishita pallavi pooja poonam prachi pragya
pratibha preeti preeti priya priyanka puja radha radhika rashmi reena rekha renu richa ritu riya rohini
ruchi rupali sadhana sakshi sangeeta sanjana sapna sarita shalini shikha shilpa shivani shraddha shreya
shruti simran sneha sonal sonali sonam sonia suman sunita supriya swati tanvi tanya trisha uma urmila
vandana varsha vidya vineeta yamini zoya ayesha farah fatima nazia noor rubina sana shabana shaheen
tabassum yasmin gurleen harleen jasleen navneet manjeet parminder kiranjeet lakshmi saraswati padma
revathi kavitha sangeetha anitha sumathi geetha latha malathi priyadarshini dhanya sreeja aswathy
`.trim().split(/\s+/));

export const SURNAMES = new Set(`
sharma verma varma gupta singh kumar yadav patel shah mehta jain agarwal aggarwal agrawal bansal goyal goel
mittal singhal garg jindal khandelwal maheshwari rastogi srivastava shrivastava saxena mathur nigam tiwari
tripathi pandey mishra dubey dwivedi chaturvedi upadhyay upadhyaya shukla bajpai vajpayee awasthi dixit
trivedi pathak joshi bhatt reddy naidu nair menon pillai iyer iyengar krishnan subramanian ramachandran
narayanan swamy murthy hegde shetty kamath prabhu gowda patil deshmukh deshpande kulkarni gokhale apte bapat
sawant pawar jadhav shinde chavan kadam gaikwad bhosale salunkhe desai parekh modi thakkar chauhan rathore
rajput solanki parmar jadeja vaghela chaudhary choudhary chowdhury chowdary dutta datta ghosh basu banerjee
chatterjee mukherjee bhattacharya bhattacharjee chakraborty chakrabarti sengupta saha mondal mandal biswas
sarkar majumdar mazumdar haldar naskar behera mohanty panda patnaik pattnaik pradhan sahoo nayak jena barik
hussain hussein ansari qureshi siddiqui shaikh sheikh syed ahmed mirza baig pathan malik rizvi naqvi kazmi
abbasi farooqui chishti gill sandhu sidhu dhillon grewal brar bajwa randhawa bains cheema kaur ahuja arora
bhatia chopra kapoor khanna khurana malhotra mehra sethi sahni sood suri talwar tandon wadhwa bedi bakshi
chawla dhawan grover kohli luthra oberoi sabharwal sachdeva taneja thomas george joseph mathew varghese
kurian abraham jacob philip chacko cherian fernandes dsouza pereira rodrigues gomes lobo pinto almeida
coutinho naik gaonkar kamat prasad sinha jha thakur ojha choubey sahu kushwaha maurya paswan manjhi mahto
kashyap rawat negi bisht bhandari dobhal nautiyal bhardwaj bharadwaj vashisht kaushik vats gautam tomar
sengar bhadoria parihar chandel baghel lodhi meena gurjar jaiswal kesarwani keshri keshari varshney rustagi
tyagi bhargava sehgal handa marwah narang vohra bhalla babbar kalra lamba makkar krishnamurthy balakrishnan
raghavan rangarajan sundaram natarajan chandrasekhar chandrasekaran rajan kumaran selvam murugan pandian
chettiar mudaliar gounder nadar raju setty bora baruah barua gogoi saikia kalita singha sangma lyngdoh
rajagopal venkataraman ramakrishnan gopalakrishnan subramaniam sastry shastri acharya bhagat dhar kaul
raina razdan wani lone bhat mir dar ganguly sanyal lahiri bagchi roychowdhury kar nath sharma pandit
`.trim().split(/\s+/));

// Surnames that are also everyday words, so they only count next to a known first name
export const AMBIGUOUS_SURNAMES = new Set(
  "more ram rai ray roy pal paul lal das sen ali rao pai dua rana bose nanda chand gill singh kumar kaur dar mir lone wani kar nath dhar bhat george thomas joseph mathew jacob philip abraham anand gautam bhagat naik modi shah jain pinto lobo".split(" ")
);

// First names that are also common words or deity names; never matched alone
export const AMBIGUOUS_FIRST = new Set(
  "asha kiran pooja puja deepak prem amar raja rani sagar sunny lucky ram shiva hari krishna ganesh laxmi lakshmi durga sita gita geeta jai raj dev om shanti shakti chanda suraj chandan moti heera hira param vijay sai uma jaya radha noor sana suman vicky anand prakash bharat uday arjun mohan gopal govind madhav keshav vishnu shankar sonam khushi simran meena vidya padma lata kamala diya ritu sapna jyoti rekha md".split(" ")
);

// Capitalised words that start sentences or headings and are never names
export const NOT_NAME = new Set(`
the this that these those there here hello hi hey dear sir madam mam team thanks thank regards best kind warm
yours sincerely please kindly note subject re fw fwd attached find mr mrs ms dr shri smt good morning evening
afternoon night today tomorrow yesterday monday tuesday wednesday thursday friday saturday sunday january
february march april may june july august september october november december india indian bank state
national new old north south east west central road street lane nagar colony sector phase block city district
village post office police station hospital school college university company private limited ltd pvt
government ministry department customer support service account card number phone mobile email address name
amount total balance payment order invoice ticket date time and or but if then also not yes no ok okay my your
our his her their its i we you he she they it is am are was were be been will shall can could would should
`.trim().split(/\s+/));
