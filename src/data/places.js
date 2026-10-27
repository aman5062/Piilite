// States, UTs and major cities. Used to recognise "City 400001" style PIN codes
// and to help the address finder. Kept as a regex alternation string.

const STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", "haryana",
  "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur",
  "meghalaya", "mizoram", "nagaland", "odisha", "orissa", "punjab", "rajasthan", "sikkim", "tamil nadu",
  "telangana", "tripura", "uttar pradesh", "uttarakhand", "uttaranchal", "west bengal", "andaman", "nicobar",
  "chandigarh", "dadra", "daman", "diu", "delhi", "new delhi", "jammu", "kashmir", "ladakh", "lakshadweep",
  "puducherry", "pondicherry", "ncr", "india",
];

const CITIES = [
  "mumbai", "bombay", "pune", "nagpur", "nashik", "thane", "navi mumbai", "aurangabad", "solapur", "kolhapur",
  "amravati", "bengaluru", "bangalore", "mysuru", "mysore", "mangaluru", "mangalore", "hubli", "dharwad", "belgaum",
  "belagavi", "chennai", "madras", "coimbatore", "madurai", "trichy", "tiruchirappalli", "salem", "tirunelveli",
  "vellore", "erode", "hyderabad", "secunderabad", "warangal", "vijayawada", "visakhapatnam", "vizag", "guntur",
  "nellore", "tirupati", "kurnool", "kochi", "cochin", "ernakulam", "thiruvananthapuram", "trivandrum",
  "kozhikode", "calicut", "thrissur", "kollam", "kannur", "kolkata", "calcutta", "howrah", "durgapur",
  "asansol", "siliguri", "kharagpur", "ahmedabad", "surat", "vadodara", "baroda", "rajkot", "bhavnagar",
  "jamnagar", "gandhinagar", "anand", "jaipur", "jodhpur", "udaipur", "kota", "ajmer", "bikaner", "alwar",
  "lucknow", "kanpur", "agra", "varanasi", "banaras", "prayagraj", "allahabad", "meerut", "ghaziabad", "noida",
  "greater noida", "bareilly", "aligarh", "moradabad", "gorakhpur", "jhansi", "mathura", "ayodhya", "faizabad",
  "saharanpur", "gurugram", "gurgaon", "faridabad", "panipat", "ambala", "karnal", "rohtak", "hisar", "sonipat",
  "ludhiana", "amritsar", "jalandhar", "patiala", "bathinda", "mohali", "bhopal", "indore", "jabalpur",
  "gwalior", "ujjain", "sagar", "rewa", "satna", "raipur", "bhilai", "bilaspur", "durg", "korba", "patna",
  "gaya", "bhagalpur", "muzaffarpur", "darbhanga", "purnia", "begusarai", "sitamarhi", "hajipur", "ara",
  "arrah", "chhapra", "motihari", "samastipur", "ranchi", "jamshedpur", "dhanbad", "bokaro", "hazaribagh",
  "deoghar", "bhubaneswar", "cuttack", "rourkela", "berhampur", "sambalpur", "puri", "guwahati", "dibrugarh",
  "silchar", "jorhat", "tezpur", "shillong", "imphal", "aizawl", "kohima", "dimapur", "agartala", "gangtok",
  "itanagar", "dehradun", "haridwar", "rishikesh", "haldwani", "roorkee", "nainital", "shimla", "dharamshala",
  "mandi", "solan", "srinagar", "leh", "panaji", "panjim", "margao", "vasco",
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");

export const PLACE_LIST = [...STATES, ...CITIES];
export const CITY_OR_STATE = PLACE_LIST.map(escape).join("|");
