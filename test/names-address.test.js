import { test } from "node:test";
import assert from "node:assert/strict";
import { types, values } from "./helpers.js";

const names = (t) => values(t, "NAME");
const addresses = (t) => values(t, "ADDRESS");

test("names after intros, in English and Hinglish", () => {
  assert.deepEqual(names("My name is Rahul Sharma and I study here"), ["Rahul Sharma"]);
  assert.deepEqual(names("mera naam priya verma hai"), ["priya verma"]);
  assert.deepEqual(names("Myself Ankit Kumar Gupta from Patna"), ["Ankit Kumar Gupta"]);
  assert.deepEqual(names("hi this is rahul"), ["rahul"]);
  assert.deepEqual(names("Name: RAJESH KUMAR"), ["RAJESH KUMAR"]);
  assert.deepEqual(names("Father's Name: Suresh Chandra Mishra"), ["Suresh Chandra Mishra"]);
});

test("names in Devanagari", () => {
  assert.deepEqual(names("मेरा नाम राहुल शर्मा है"), ["राहुल शर्मा"]);
});

test("honorifics and relations keep the label, redact the name", () => {
  assert.deepEqual(names("Shri Ramesh Chand Yadav S/O Late Mohan Lal Yadav"), ["Ramesh Chand Yadav", "Mohan Lal Yadav"]);
  assert.deepEqual(names("Dr. Kavita Nair will call"), ["Kavita Nair"]);
  assert.deepEqual(names("Smt. Sunita Devi"), ["Sunita Devi"]);
});

test("dictionary names without any trigger", () => {
  assert.deepEqual(names("Please forward this to Neha Agarwal today"), ["Neha Agarwal"]);
  assert.deepEqual(names("Mohd Imran Qureshi joined"), ["Mohd Imran Qureshi"]);
  assert.deepEqual(names("Regards,\nPriyanka Iyer"), ["Priyanka Iyer"]);
  assert.deepEqual(names("The meeting with Sunil is on Monday"), ["Sunil"]);
});

test("names: common words are not names", () => {
  assert.deepEqual(names("Read More about the State Bank of India offers"), []);
  assert.deepEqual(names("I am going to Delhi tomorrow, this is great"), []);
  assert.deepEqual(names("Asha hai ki kal baarish hogi"), []);
  assert.deepEqual(names("file name is report.pdf"), []);
  assert.deepEqual(names("Main Road is closed"), []);
});

test("address after a label, ending at the PIN code", () => {
  assert.deepEqual(addresses("Address: Flat no 302, Sai Krupa Apartment, MG Road, Pune - 411001. Phone 9123456780"), [
    "Flat no 302, Sai Krupa Apartment, MG Road, Pune - 411001",
  ]);
  assert.deepEqual(addresses("I live in Andheri West, Mumbai 400053"), ["Andheri West, Mumbai 400053"]);
  assert.deepEqual(addresses("ghar ka pata hai 12, Gandhi Nagar, Bhopal"), ["12, Gandhi Nagar, Bhopal"]);
});

test("rural address with village markers", () => {
  assert.deepEqual(addresses("Vill. Rampur, Post Sonbarsa, Dist. Sitamarhi, Bihar 843302"), [
    "Vill. Rampur, Post Sonbarsa, Dist. Sitamarhi, Bihar 843302",
  ]);
});

test("house-number addresses", () => {
  assert.deepEqual(addresses("Mohd Imran, H.No 12-3-45, Tolichowki, Hyderabad 500008"), ["H.No 12-3-45, Tolichowki, Hyderabad 500008"]);
});

test("email address label is not a postal address", () => {
  assert.deepEqual(types("email address: rahul.s@gmail.com"), ["EMAIL"]);
});

test("the verb 'address' is not an address", () => {
  assert.deepEqual(addresses("Prime Minister addressed the nation from Red Fort"), []);
  assert.deepEqual(addresses("we need to address the issue soon"), []);
});

test("shipping and delivery labels", () => {
  assert.deepEqual(addresses("Shipping: 45, 2nd Cross, Indiranagar, Bengaluru 560038. Thanks"), ["45, 2nd Cross, Indiranagar, Bengaluru 560038"]);
  assert.deepEqual(addresses("my address is 7 Park Street, Kolkata 700016"), ["7 Park Street, Kolkata 700016"]);
});

test("Hinglish chat without PII stays untouched", () => {
  for (const t of [
    "mujhe nahi pata yaar, kal dekhte hai",
    "pata hai kal chhutti hai?",
    "मुझे पता नहीं",
    "main ghar ja raha hu, tu aa raha hai kya",
    "bhai kal match dekha? Kohli ne century maari",
    "aaj office mein meeting thi 3 baje",
  ]) {
    assert.deepEqual(types(t), [], t);
  }
});

test("Hinglish address labels", () => {
  assert.deepEqual(addresses("mera pata hai 21, Lajpat Nagar, Delhi 110024"), ["21, Lajpat Nagar, Delhi 110024"]);
  assert.deepEqual(addresses("पता: 14, गांधी मार्ग, जयपुर 302001"), ["14, गांधी मार्ग, जयपुर 302001"]);
});

test("initial-first South Indian names", () => {
  assert.deepEqual(names("Report by K. Ramesh today"), ["K. Ramesh"]);
  assert.deepEqual(names("Signed: A.K. Sharma"), ["A.K. Sharma"]);
  assert.deepEqual(names("Meet R Madhavan at 5"), ["R Madhavan"]);
});

test("places named after people are not names", () => {
  assert.deepEqual(names("Shop in Gandhi Nagar market"), []);
  assert.deepEqual(names("Meet at Nehru Place metro"), []);
  assert.deepEqual(names("Indira Gandhi Airport is busy"), []);
});

test("bigger name dictionary covers all regions", () => {
  for (const n of ["Sukhpreet Dhaliwal", "Anwesha Bhattacharyya", "Tabrez Ansari", "Dinshaw Wadia", "Jince Varghese", "Bhargav Phukan", "Lavanya Iyengar"]) {
    assert.ok(names(`Please contact ${n} soon`).some((v) => v.includes(n.split(" ")[1])), n);
  }
});

test("name triggers in Indian scripts", () => {
  assert.deepEqual(names("আমার নাম সৌরভ গাঙ্গুলী"), ["সৌরভ গাঙ্গুলী"]);
  assert.deepEqual(names("என் பெயர் கார்த்திக்"), ["கார்த்திக்"]);
  assert.deepEqual(names("నా పేరు రాము"), ["రాము"]);
  assert.deepEqual(names("મારું નામ હેતલ પટેલ છે"), ["હેતલ પટેલ"]);
  assert.deepEqual(names("ਮੇਰਾ ਨਾਮ ਗੁਰਪ੍ਰੀਤ ਹੈ"), ["ਗੁਰਪ੍ਰੀਤ"]);
  assert.deepEqual(names("ನನ್ನ ಹೆಸರು ಮಂಜುನಾಥ"), ["ಮಂಜುನಾಥ"]);
  assert.deepEqual(names("എന്റെ പേര് അനു ആണ്"), ["അനു"]);
  assert.deepEqual(names("माझे नाव सचिन आहे"), ["सचिन"]);
  assert.deepEqual(names("नाम से पता चलता है"), []);
});

test("addresses from landmarks and localities", () => {
  assert.deepEqual(addresses("Come to near Hanuman Mandir, Sector 15, Noida"), ["near Hanuman Mandir, Sector 15, Noida"]);
  assert.deepEqual(addresses("Office: 3rd Cross, Koramangala, Bengaluru 560034"), ["3rd Cross, Koramangala, Bengaluru 560034"]);
  assert.deepEqual(addresses("Sector 5 sales grew by 10%"), []);
});

test("address labels in Indian scripts", () => {
  assert.deepEqual(addresses("ঠিকানা: ১২ পার্ক স্ট্রিট, কলকাতা ৭০০০১৬"), ["১২ পার্ক স্ট্রিট, কলকাতা ৭০০০১৬"]);
  assert.deepEqual(addresses("முகவரி: 5, அண்ணா சாலை, சென்னை 600002"), ["5, அண்ணா சாலை, சென்னை 600002"]);
});

test("unlabelled address after a name, anchored on the PIN code", () => {
  assert.deepEqual(addresses("Shri Ram Lal S/O Mohan Lal, 45, Civil Lines, Jaipur 302001"), ["45, Civil Lines, Jaipur 302001"]);
  assert.deepEqual(addresses("Deliver it: Neha, 149, 2nd Cross, Indiranagar, Bengaluru - 560038"), ["149, 2nd Cross, Indiranagar, Bengaluru - 560038"]);
  assert.deepEqual(addresses("Our Pune 411045 office is open"), []);
});

test("rooms and blocks in office text are not addresses", () => {
  assert.deepEqual(addresses("Room 204, Block B is reserved for the workshop."), []);
});

test("role labels and 'myself' take unknown capitalised names", () => {
  assert.deepEqual(names("Myself Pratyush Nandwana from Pune"), ["Pratyush Nandwana"]);
  assert.deepEqual(names("Candidate: Tejaswini Rangnekar | x@y.in"), ["Tejaswini Rangnekar"]);
  assert.deepEqual(names("Spoke to Ojasvi Thakre about it"), ["Ojasvi Thakre"]);
  assert.deepEqual(names("S/O Gurpreet Singh Sandhu"), ["Gurpreet Singh Sandhu"]);
  assert.deepEqual(names("myself going to market"), []);
});

test("typical Indian surname endings", () => {
  assert.deepEqual(names("Thanks Hrishikesh Joglekar for the help"), ["Hrishikesh Joglekar"]);
  assert.deepEqual(names("Ask Darshil Vekariya"), ["Darshil Vekariya"]);
});

test("CSV rows: name cell followed by a phone or email cell", () => {
  assert.deepEqual(names("Nirav Thummar,9123456780,nirav@x.in"), ["Nirav Thummar"]);
  assert.deepEqual(names("Gargi Ranadive; gargi@mail.com"), ["Gargi Ranadive"]);
  assert.deepEqual(names("Monthly Report, sent to 9123456780"), []);
});

test("résumé header line is a name", () => {
  assert.deepEqual(names("Aarav Neel Mehrotra\nBackend Developer | APIs\naarav.m@mail.test | +91 91234 56780"), ["Aarav Neel Mehrotra"]);
  assert.deepEqual(names("TANVI RAO\ntanvi.r@mail.test"), ["TANVI RAO"]);
  assert.deepEqual(names("Software Developer\ndev@mail.test"), []);
});

test("schools and tools are not names", () => {
  assert.deepEqual(names("CBSE at Sunrise Vidya Mandir, Bhopal"), []);
  assert.deepEqual(names("Skills: Power BI, MS Excel, MS Word"), []);
  assert.deepEqual(names("Ms. Kavya Rao will join"), ["Kavya Rao"]);
});

test("first name + unknown middle + surname", () => {
  assert.deepEqual(names("Contact Suresh Lal Yadav today"), ["Suresh Lal Yadav"]);
});

test("LOCATION is opt-in", async () => {
  const { Piilite } = await import("../src/index.js");
  const text = "Based in: Kotputli, Rajasthan\nLanguages: English";
  assert.deepEqual(new Piilite().scan(text), []);
  const loc = new Piilite({ include: ["LOCATION"] }).scan(text);
  assert.deepEqual(loc.map((d) => [d.type, d.value]), [["LOCATION", "Kotputli, Rajasthan"]]);
  assert.deepEqual(new Piilite({ include: ["LOCATION"] }).scan("Studied at Example State University, Jaipur"), []);
});

test("LOCATION stops before the next profile field", async () => {
  const { Piilite } = await import("../src/index.js");
  const s = new Piilite({ include: ["LOCATION"] });
  assert.deepEqual(s.scan("class of 2026 Based in: Kotputli Open to: Full-time").map((d) => d.value), ["Kotputli"]);
});

test("after a Name: label, take capitalised words up to the next field", () => {
  assert.deepEqual(names("Name: Test Student Two Skills: React"), ["Test Student Two"]);
  assert.deepEqual(names("Name: Aarav Mehrotra\nSkills: Go"), ["Aarav Mehrotra"]);
  assert.deepEqual(names("my name is rahul and I code"), ["rahul"]);
});

test("company addresses are masked by default; keepCompanyAddresses leaves them", async () => {
  const { Piilite } = await import("../src/index.js");
  const office = "Office: Example Technologies Pvt Ltd, Sector 62, Noida";
  assert.deepEqual(addresses(office), ["Sector 62, Noida"]);
  const keep = new Piilite({ keepCompanyAddresses: true });
  assert.deepEqual(keep.scan(office).filter((d) => d.type === "ADDRESS"), []);
  assert.deepEqual(keep.scan("Bill to Acme Infotech LLP, 12, MG Road, Pune 411001").filter((d) => d.type === "ADDRESS"), []);
  // a bank used as a landmark is still a personal address, even with the option on
  assert.deepEqual(keep.scan("Come to near ICICI Bank, Sector 15, Noida").map((d) => d.value), ["near ICICI Bank, Sector 15, Noida"]);
});
