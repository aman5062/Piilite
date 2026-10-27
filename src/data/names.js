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

aadarsh aakash aarnav abhimanyu achyut adarsh adinath advait agastya ajinkya akhilesh alankar ambar amitesh
amrit anay anirban anshuman antariksh anubhav apoorv arpit aryan ashwath atharv avdhesh balram bhanu bhaskar
bhupendra bipin brajesh chaitanya chandramohan charan daksh debojyoti deepanshu devansh devashish dhairya
dharam dushyant ganesh gaurang ghanshyam gopinath gulshan gyan hari haresh harinder hemendra hrithik indrajit
ishwar jagannath jagjit janardan jeevan jignesh kailash kalyan kamal kanhaiya kapil karthick kartikeya ketan
kirti krish kshitij lakshya laxman madhukar mahavir mahendra mangesh manohar manthan mayur milind mithun
mridul mrinal nagendra nakul nandan narayan navneet nihar nikunj nilay nimesh nirmal nitish ojas omprakash
pallav paramjit parag parikshit pradyumna prajwal pranay prashanth pravin prem prince pulkit purushottam
raghu raghunath rajan rajkumar rajnish rakshit ramakant ramesh ranveer ratan ravindra ritwik rohtash ronak
rudra rupesh sachchidanand sagar sahdev sameep samarth sanchit sandesh sangram sanket saransh sarvesh satyam
satyendra saurav shailendra shankar sharvan shashi shaurya shiv shivendra shrikant shyam siddhesh som subodh
sudarshan sudhanshu sujay sumeet sunny surendra suryansh susheel swaraj tanay tejas trilok tushar ujjwal
umang upendra utsav vaibhav vansh vasant vedprakash venkatesh vibhav vidyut vighnesh vikrant vimal vinayak
viraj virendra vishwas vivaan yatin yogendra yudhishthir
abhilash ajith anand anil aravind arjun ashwin bala chandran deepak dileep gokul gopi hari jayan jithesh
krishnakumar mahesh manoj midhun nandakumar pradeep prajith rahul rajeesh ranjith sajith sanal sanjay
santhosh sarath shaji shyam sibin sujith sunil sreenath unni vimal vinod vishnu
aravindan dinesh elango gopinath ilango jayakumar kannan kathir kumar madhavan manikandan muthu nandhakumar
prabhu ragul rajkumar ramesh sathish senthilkumar shankar sundar thangaraj thiru vasanth velu vignesh
anjaneyulu chiranjeevi gopalakrishna harikrishna koteswara lakshman mallikarjun nagarjuna narasimha prabhakar
rambabu ramu ravikiran satyanarayana srikanth srinu subbarao sudheer venkateswara
ayan biplab biswajit dipankar gautam kaushik prasenjit rajarshi saikat shubhankar soumitra subrata sukanta
tapas tathagata
ajmal altaf anwar arshad ashraf azad dawood ejaz fahad fardeen faraz feroz habib hamid haris hasan hassan
imtiaz ishaq jamal jawed kabir kaleem karim khalil mahmood majid mansoor masood mehboob moin mujahid mukhtar
murtaza mustafa nadeem naveed nawaz obaid omar parvez rafiq rahim rehan sadiq saeed saif sajjad sameer
saqib shabbir shadab shafiq shahnawaz shamim sharif shoeb sohail sufiyan tabrez taufiq umar usman wajid
waseem yaseen zafar zeeshan
amarjeet baljit bhupinder charanjit davinder gurjeet gurmeet gurnam harbhajan harjinder harvinder inderjit
jagmeet jarnail jasbir kanwaljit karamjit lakhwinder mandeep paramvir pritpal ranbir ranjit satnam sukhdev
sukhjinder surjit tejinder
aldrin anthony ashley benny binu chris cyril dennis derek elvis francis gilbert ivan jerry jince jobin
johnson jomon joseph joshy justin kevin linto melvin nelson noel peter reji robin roshan sabu shibu sijo
simon stanley stephen sunny thomas tony vinu wilson
aadhya aarohi aashna advika akshara alisha amisha amruta anamika anika anisha anjana ankita antara anupriya
anvi apeksha arundhati ashwini avani bhagyashree bhumika charu chhavi damini darshana deeksha devyani dhriti
disha drishti eesha ekta garima gayatri gunjan harsha hema himani indu ira ishani janhvi jasmine jhanvi juhi
kanak kanika kashish kaveri ketaki kirti krutika kumud lavanya leela madhavi mahima malini manju manvi
maya medha mehak mitali mohini mridula namita namrata nandita neelima neetu nikita nirmala niyati pakhi
pallavi parul payal poorva pranjal prarthana pratiksha preksha pritika purvi rachna ragini rajni ranjana
rashi ratna reema reshma ridhi rimjhim roshni rucha rupa saanvi sakshi saloni samiksha sanchita sandhya
sangita sanya sarika seema shaila shalu sharmila sheetal shilpi shobha shubhangi shweta siddhi smita
smriti snehal sonakshi srishti sudha sujata sukanya sulochana sushma swara tanisha tanuja trupti tulsi
urvashi vaishali vani vartika vedika vibha vinita vrinda yashika yogita
ambika anitha bindu deepthi divya gopika indira jayashree jyothi kalyani kavya lakshmi leena manjula
meera nithya parvathy prameela preetha radhika ramya rekha remya revathy saritha shanthi sindhu sreelakshmi
sruthi suja sumathi swapna thulasi usha vasantha vijayalakshmi
anwesha arpita barnali debjani dipika ishita moumita oindrila paromita piyali rituparna sanchari sayani
sharmistha sohini soma sreyashi sudeshna susmita tanushree
afreen aliya amna anam arshi asma bushra farheen fiza haleema hina humaira iram khadija mahira maryam
mehjabeen muskan nargis nasreen nida nilofar parveen rabia rehana ruksar rukhsana saba sadia safiya
saima samina sania shabnam shagufta shazia sumaiya tahira uzma zainab zeenat zubeda
amandeep gurpreet harmeet harpreet inderpreet jasmeet jaswinder kamaljeet kulwinder manjit navjot parmjit
rajwinder sarabjit sukhpreet
alisha angel ann anna annie beena celine christina daisy elizabeth jenny jessy jincy jismy julie liya
maria mary merin neethu nimmy reena riya rosamma rose sherin sneha sonia teresa tinu
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

agnihotri ahluwalia ambedkar anand ansal arya asthana atre awasthy bajaj banerji barman bhalerao bhandarkar
bhasin bhatnagar bhattacharyya bhave bhonsle bhowmick bhuyan bisht bose chakravarty chandak chandra chaturvedi
chhabra chitnis choksi contractor dalal damle dange dasgupta dave deo deol desai dhadda dhamija dhanuka
dhoni dhupar dixit doshi dugar dutt gadgil gaikwad ganatra gandhi garewal ghatak godbole gokarn gola
goradia goswami guha gulati gupte halder hazarika hiremath iyengar jadhav jagtap jaitley jhaveri jhunjhunwala
joshi kabra kakkar kale kalia kanojia kapadia kapur karnik kathuria kaushal khandekar khanna kher khosla
kirloskar kochhar kothari kripalani kumawat lad lakhani lalwani lele lokhande loya mahajan maheshwari
mahindra majithia malviya mane manjrekar marathe mehrotra merchant mhatre mirchandani mistry mohanty
motwani mukherji munshi murthy nadkarni nagpal nambiar namboodiri nanavati narula nayar nayyar nehra
ogale oswal padukone pai palkar palsule pande pandya paranjape parikh parulekar patankar pathania
patwardhan phadke phadnis pillay poddar ponnappa poonawala purohit rajagopalan rajput ramaswamy ranade
rane rathi rathod raut rawal rege sabnis sachdev sahay sahgal saigal salvi samant sanghvi sant saraf
sarin sathe savarkar sawhney sehwag sekhon seth shah shenoy shroff sidhwani singla sodhi somani sonawane
subramanyam sule sundaresan suryavanshi swaminathan tagore talreja tamhane tata tendulkar thackeray
thakare thapar tikoo tilak toor tripathy vaid vakil vartak vasudevan vyas wadia wagh walia yadav zaveri
achari ayyar bhaskaran chandrasekharan devarajan eapen gopalan govindan jayaraman kannan krishnaswamy
kurup madhavan mahalingam muthuswamy nagarajan nambiar padmanabhan panicker parameswaran pisharody
ramakrishna ramanathan sankaran seshadri sivaraman srinath thampi unnikrishnan varier venugopal warrier
ahmad alam ansary azmi bukhari chaudhry dehlvi faruqui gilani haider hashmi husain jafri kidwai lari
mansoori mirza nadvi nomani quadri rahman rizvi saifi salmani shah shamsi siddiqi sultan usmani zaidi
ahluwalia atwal aulakh bal bhullar chahal chatha deol dhaliwal dhindsa gosal heer hundal johal kahlon
kang khaira khehra mann maan nijjar pannu sahota sangha sarai sekhon sohal sohi thind toor virk
alvares andrade barreto braganza carvalho correia costa crasto cunha dcosta dcruz dias dmello fonseca
furtado lewis lopes machado mascarenhas menezes miranda monteiro noronha rebello saldanha sequeira
silva soares vaz
batliwala bharucha billimoria contractor daruwala engineer godrej irani jeejeebhoy mistry patel sethna
tata wadia
borah chetia deka dutta goswami hazarika kakati mahanta medhi phukan rajkhowa sarma talukdar
`.trim().split(/\s+/));

// Surnames that are also everyday words, so they only count next to a known first name
export const AMBIGUOUS_SURNAMES = new Set(
  "more ram rai ray roy pal paul engineer contractor merchant tata sultan dave lad mane deo bal heer maan mann kang sant gola dias costa silva lewis vaz sarin lal das sen ali rao pai dua rana bose nanda chand gill singh kumar kaur dar mir lone wani kar nath dhar bhat george thomas joseph mathew jacob philip abraham anand gautam bhagat naik modi shah jain pinto lobo".split(" ")
);

// First names that are also common words or deity names; never matched alone
export const AMBIGUOUS_FIRST = new Set(
  "asha kiran pooja puja deepak prem amar raja rani sagar sunny lucky ram shiva hari krishna ganesh laxmi lakshmi durga sita gita geeta jai raj dev om shanti shakti chanda suraj chandan moti heera hira param vijay sai uma jaya radha noor sana suman vicky anand prakash bharat uday arjun mohan gopal govind madhav keshav vishnu shankar sonam khushi simran meena vidya padma lata kamala diya ritu sapna jyoti rekha md prince sunny angel rose daisy jasmine maya gyan kirti ratna tulsi indu rupa usha hema leela vani ira kabir som shiv shyam lakshya ganesh mahavir kamal jeevan ishwar nirmal vimal ratan sudha shobha raghu mithun pakhi charu".split(" ")
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
excel word office powerpoint outlook access teams sql azure aws google microsoft python java javascript react
node angular vue linux windows android ios figma canva tableau power bi git docker kubernetes resume curriculum
vitae profile summary objective education experience skills projects certifications achievements languages
software developer engineer intern student fresher full stack frontend backend data analyst scientist designer
`.trim().split(/\s+/));
