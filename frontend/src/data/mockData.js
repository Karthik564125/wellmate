// Sample data for the Wellmate frontend. Pure constants only; no UI code and no backend calls.

// Role definitions used for role selection; labelKey points into the translations file.
export const ROLES = [
  { id: 'admin', labelKey: 'roles.admin' },
  { id: 'caretaker', labelKey: 'roles.caretaker' },
  { id: 'family', labelKey: 'roles.family' },
  { id: 'elder', labelKey: 'roles.elder' },
  { id: 'volunteer', labelKey: 'roles.volunteer' },
];

// Elderly people being cared for; status flags whether they currently need assistance.
// Field names match the backend Elder schema (displayName, area, bloodGroup, conditions
// as objects) so swapping this for a real API response later needs no page rewrites.
// age/city/phone/avatar/status are demo-only conveniences with no backend equivalent yet
// (age is also kept alongside dateOfBirth so every display site keeps working unchanged).
export const ELDERLY_PEOPLE = [
  {
    id: 'elder-lakshmi',
    displayName: 'Lakshmi Devi',
    age: 72,
    dateOfBirth: '1953-04-12',
    area: 'Hyderabad',
    address: '12-2-45, Lane near Ganesh Temple, Basheerbagh, Hyderabad',
    phone: '+91 98480 11223',
    bloodGroup: 'B+',
    conditions: [
      { id: 'cond-lakshmi-1', name: 'Type 2 diabetes', sinceYear: 2015, status: 'active', notes: '' },
      { id: 'cond-lakshmi-2', name: 'Hypertension', sinceYear: 2018, status: 'active', notes: '' },
      { id: 'cond-lakshmi-3', name: 'Vitamin D deficiency', sinceYear: 2023, status: 'managed', notes: '' },
    ],
    avatar: 'LD',
    status: 'needs-assistance',
  },
  {
    id: 'elder-ramaiah',
    displayName: 'Ramaiah Naidu',
    age: 78,
    dateOfBirth: '1947-08-02',
    area: 'Hyderabad',
    address: '5-9-18, Opposite Venkateswara Temple, Himayatnagar, Hyderabad',
    phone: '+91 97010 45678',
    bloodGroup: 'O+',
    conditions: [
      { id: 'cond-ramaiah-1', name: 'Coronary artery disease', sinceYear: 2012, status: 'managed', notes: '' },
      { id: 'cond-ramaiah-2', name: 'Arthritis', sinceYear: 2019, status: 'active', notes: '' },
    ],
    avatar: 'RN',
    status: 'stable',
  },
  {
    id: 'elder-sarojini',
    displayName: 'Sarojini Rao',
    age: 68,
    dateOfBirth: '1957-11-30',
    area: 'Hyderabad',
    address: '3-4-112, Near Shiva Temple, Kukatpally, Hyderabad',
    phone: '+91 90301 77654',
    bloodGroup: 'A+',
    conditions: [
      { id: 'cond-sarojini-1', name: 'Asthma', sinceYear: 2010, status: 'active', notes: '' },
      { id: 'cond-sarojini-2', name: 'Mild osteoporosis', sinceYear: 2021, status: 'managed', notes: '' },
    ],
    avatar: 'SR',
    status: 'stable',
  },
];

// Family members linked to an elder, with their relation and contact number.
// name/phone already match the backend User schema; relation and elderId match CareLink.
export const FAMILY_MEMBERS = [
  { id: 'fam-meera', name: 'Meera', relation: 'Daughter', phone: '+91 98490 33401', elderId: 'elder-lakshmi' },
  { id: 'fam-anjali', name: 'Anjali', relation: 'Daughter-in-law', phone: '+91 98660 52210', elderId: 'elder-lakshmi' },
  { id: 'fam-ravi', name: 'Ravi', relation: 'Son', phone: '+91 99590 14870', elderId: 'elder-lakshmi' },
  { id: 'fam-suresh', name: 'Suresh', relation: 'Nephew', phone: '+91 94410 26639', elderId: 'elder-ramaiah' },
];

// Caretakers with their contact details, specialty, availability and assigned elders.
export const CARETAKERS = [
  {
    id: 'care-kavitha',
    name: 'Kavitha Reddy',
    phone: '+91 98111 60234',
    specialty: 'Diabetes and daily medicine support',
    availability: 'Weekdays, 8 AM – 4 PM',
    assignedElderIds: ['elder-lakshmi'],
    shift: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '08:00', end: '16:00' },
  },
  {
    id: 'care-prakash',
    name: 'Prakash Goud',
    phone: '+91 98490 88120',
    specialty: 'Mobility and physiotherapy assistance',
    availability: ['Mon', 'Wed', 'Sat'],
    assignedElderIds: ['elder-ramaiah', 'elder-sarojini'],
    shift: { days: ['Mon', 'Wed', 'Sat'], start: '14:00', end: '20:00' },
  },
];

// Community volunteers who take up help requests in their area.
export const VOLUNTEERS = [
  {
    id: 'vol-sandeep',
    name: 'Sandeep Varma',
    area: 'Basheerbagh',
    skills: ['Medicine pickup', 'Grocery shopping'],
    completedCount: 14,
    assignedRequestIds: ['help-001'],
  },
  {
    id: 'vol-padma',
    name: 'Padma Lakshmi',
    area: 'Himayatnagar',
    skills: ['Companionship', 'Hospital visits'],
    completedCount: 6,
    assignedRequestIds: [],
  },
];

// Medicines on the prescription with dose, timing slot, refill stock and who handles refills.
// name/instructions/dosage match the backend Medicine schema; times/startDate/endDate are
// added alongside for shape alignment, though the current UI still groups by the
// schedule/timing slot fields rather than reading times[] directly.
// stockDaysLeft/refillBy/refilledBy are demo-only: the backend has no stock-tracking
// concept yet (DoseLog only records taken/missed/skipped per scheduled time).
export const MEDICINES = [
  {
    id: 'med-vitd3',
    name: 'Vitamin D3',
    dosage: '60k IU',
    schedule: 'weekly',
    timing: 'Once a week, Sunday',
    times: ['09:00'],
    startDate: '2024-01-01',
    endDate: null,
    instructions: 'Take with a meal once a week on Sunday.',
    stockDaysLeft: 3,
    refillBy: 'Dec 14',
    refilledBy: 'Anjali',
  },
  {
    id: 'med-metformin',
    name: 'Metformin',
    dosage: '500 mg',
    schedule: 'post-breakfast',
    timing: 'Morning and night, after food',
    times: ['08:30', '20:30'],
    startDate: '2023-06-01',
    endDate: null,
    instructions: 'Take after breakfast and after dinner.',
    stockDaysLeft: 4,
    refillBy: 'Nov 25',
    refilledBy: 'Ravi',
  },
  {
    id: 'med-amlodipine',
    name: 'Amlodipine',
    dosage: '5 mg',
    schedule: 'morning',
    timing: 'Once daily, morning',
    times: ['07:30'],
    startDate: '2022-03-15',
    endDate: null,
    instructions: 'Take once daily in the morning with water.',
    stockDaysLeft: 9,
    refillBy: 'Nov 30',
    refilledBy: 'Ravi',
  },
  {
    id: 'med-calcium',
    name: 'Calcium',
    dosage: '500 mg',
    schedule: 'evening',
    timing: 'Once daily, night',
    times: ['21:00'],
    startDate: '2024-02-01',
    endDate: null,
    instructions: 'Take once daily at night after dinner.',
    stockDaysLeft: 21,
    refillBy: 'Dec 12',
    refilledBy: 'Meera',
  },
  {
    id: 'med-pantoprazole',
    name: 'Pantoprazole',
    dosage: '40 mg',
    schedule: 'afternoon',
    timing: 'Once daily, after lunch',
    times: ['13:30'],
    startDate: '2024-05-10',
    endDate: null,
    instructions: 'Take once after lunch, with a glass of water.',
    stockDaysLeft: 12,
    refillBy: 'Dec 5',
    refilledBy: 'Meera',
  },
];

// Fixed daily medicine slots shown on the medicine schedule.
export const DAILY_MEDICINE_SLOTS = [
  { id: 'morning', label: 'Morning tablets', time: '6–8 AM' },
  { id: 'post-breakfast', label: 'Post-breakfast tablets', time: '8–9 AM' },
  { id: 'afternoon', label: 'Afternoon tablets', time: 'After lunch' },
  { id: 'evening', label: 'Evening tablets', time: 'Night' },
];

// Doctor appointments, both upcoming and past, with cab and companion booking state.
export const APPOINTMENTS = [
  {
    id: 'appt-eye',
    title: 'Eye check-up',
    doctor: 'Dr. Sharma',
    place: 'Sunrise Eye Clinic',
    date: 'Nov 24',
    time: '10:30 am',
    status: 'booked',
    bookedBy: 'Ravi',
    cabBooked: true,
    past: false,
  },
  {
    id: 'appt-cardio',
    title: 'Cardiology follow-up',
    doctor: 'Dr. Rao',
    place: 'City Heart Centre',
    date: 'Dec 3',
    time: 'Time not fixed',
    status: 'not-booked-yet',
    bookedBy: null,
    cabBooked: false,
    past: false,
  },
  {
    id: 'appt-diabetes',
    title: 'Diabetes review and HbA1c',
    doctor: 'Dr. Iyer',
    place: 'Care Hospital',
    date: 'Dec 10',
    time: '9:00 am',
    status: 'booked',
    bookedBy: 'Anjali',
    cabBooked: false,
    past: false,
  },
  {
    id: 'appt-physician',
    title: 'Physician visit',
    doctor: 'Dr. Iyer',
    place: 'Care Hospital',
    date: 'Nov 05',
    time: '11:00 am',
    status: 'completed',
    bookedBy: 'Ravi',
    cabBooked: true,
    past: true,
  },
  {
    id: 'appt-dental',
    title: 'Dental cleaning',
    doctor: 'Dr. Priya Menon',
    place: 'Smile Dental',
    date: 'Oct 19',
    time: '4:00 pm',
    status: 'completed',
    bookedBy: 'Meera',
    cabBooked: false,
    past: true,
  },
];

// Care tasks assigned to a family member, with due date and completion state.
export const TASKS = [
  { id: 'task-cardio', title: 'Book cardiology follow-up for December', due: 'Nov 18', overdue: true, assignee: 'Anjali', done: false },
  { id: 'task-refill', title: 'Pick up Metformin and Amlodipine refill', due: 'Nov 22', overdue: false, assignee: 'Ravi', done: false },
  { id: 'task-blood', title: 'Collect blood test report from lab', due: 'Nov 21', overdue: false, assignee: 'Meera', done: false },
  { id: 'task-discharge', title: "Upload last month's discharge summary", due: 'Nov 25', overdue: false, assignee: 'Suresh', done: false },
  { id: 'task-cab', title: 'Arrange cab for Tuesday eye check-up', due: 'Nov 24', overdue: false, assignee: 'Ravi', done: false },
];

// Help requests raised by families and picked up by volunteers near the elder's home.
export const HELP_REQUESTS = [
  {
    id: 'help-001',
    elderlyPerson: 'Lakshmi Devi',
    summary: 'Needs medicines and groceries delivered this week',
    medicines: ['Metformin 500 mg', 'Amlodipine 5 mg'],
    groceries: ['Toor dal', 'Rice (5 kg)', 'Milk (2 packets)'],
    address: 'near Ganesh Temple, Basheerbagh, Hyderabad',
    status: 'open',
    requestedBy: 'Ravi',
  },
  {
    id: 'help-002',
    elderlyPerson: 'Ramaiah Naidu',
    summary: 'Needs a volunteer to accompany him to the physiotherapy session',
    medicines: [],
    groceries: [],
    address: 'Opposite Venkateswara Temple, Himayatnagar, Hyderabad',
    status: 'accepted',
    requestedBy: 'Suresh',
  },
  {
    id: 'help-003',
    elderlyPerson: 'Sarojini Rao',
    summary: 'Collect inhaler refill from the pharmacy',
    medicines: ['Salbutamol inhaler'],
    groceries: [],
    address: 'Near Shiva Temple, Kukatpally, Hyderabad',
    status: 'completed',
    requestedBy: 'Prakash Goud',
  },
];

// Cab rides booked for elders' hospital visits, with driver contact and ride status.
export const CAB_RIDES = [
  {
    id: 'ride-001',
    elderlyPerson: 'Lakshmi Devi',
    driverName: 'Mohammed Irfan',
    vehicle: 'Dzire, TS 09 AB 4421',
    driverPhone: '+91 98666 20145',
    pickup: 'Basheerbagh, near Ganesh Temple',
    destination: 'Sunrise Eye Clinic, Abids',
    appointmentDate: 'Nov 24, 10:30 am',
    status: 'assigned',
  },
  {
    id: 'ride-002',
    elderlyPerson: 'Lakshmi Devi',
    driverName: 'Venkat Rao',
    vehicle: 'Ertiga, TS 07 CD 1180',
    driverPhone: '+91 99120 83307',
    pickup: 'Basheerbagh, near Ganesh Temple',
    destination: 'Care Hospital, Banjara Hills',
    appointmentDate: 'Dec 10, 9:00 am',
    status: 'pending',
  },
  {
    id: 'ride-003',
    elderlyPerson: 'Ramaiah Naidu',
    driverName: 'Syed Imran',
    vehicle: 'Indica, TS 10 EF 6612',
    driverPhone: '+91 90004 55871',
    pickup: 'Himayatnagar, Venkateswara Temple road',
    destination: 'City Heart Centre, Secunderabad',
    appointmentDate: 'Oct 28, 8:30 am',
    status: 'completed',
  },
];

// Cab drivers available in the area, with distance, rating and availability.
export const DRIVERS = [
  { id: 'drv-irfan', name: 'Mohammed Irfan', vehicle: 'Dzire (Sedan)', distanceKm: 2.4, rating: 4.8, available: true },
  { id: 'drv-venkat', name: 'Venkat Rao', vehicle: 'Ertiga (MUV)', distanceKm: 3.9, rating: 4.6, available: true },
  { id: 'drv-imran', name: 'Syed Imran', vehicle: 'Indica (Hatchback)', distanceKm: 5.1, rating: 4.4, available: false },
];

// Insurance policies held for elders, with coverage, premium schedule and past payments.
// provider/policyNumber/policyType/sumInsured match the backend InsurancePolicy schema;
// validFrom/validTo/helplineNumber/coverageItems are added for shape alignment.
// annualPremium/premiumDueDate/renewalDate/paymentHistory/status are demo-only: the
// backend has no premium or payment-history concept on InsurancePolicy yet.
export const INSURANCE_POLICIES = [
  {
    id: 'pol-lakshmi',
    provider: 'Star Health',
    policyNumber: 'SH-44190827',
    policyType: 'Senior citizen health plan',
    sumInsured: 500000,
    validFrom: '2024-03-15',
    validTo: '2025-03-15',
    helplineNumber: '1800-123-4567',
    coverageItems: ['Hospitalisation', 'Pre and post hospitalisation', 'Day-care procedures'],
    annualPremium: 18450,
    premiumDueDate: 'Dec 01',
    renewalDate: 'Mar 15',
    status: 'active',
    paymentHistory: [
      { date: 'Dec 01, 2024', amount: 18450, status: 'completed' },
      { date: 'Dec 01, 2023', amount: 16900, status: 'completed' },
    ],
  },
  {
    id: 'pol-ramaiah',
    provider: 'Niva Bupa',
    policyNumber: 'NB-70215634',
    policyType: 'Critical illness cover',
    sumInsured: 1000000,
    validFrom: '2024-01-10',
    validTo: '2025-01-10',
    helplineNumber: '1800-987-6543',
    coverageItems: ['Critical illness lump sum', 'Second opinion consult'],
    annualPremium: 24800,
    premiumDueDate: 'Jan 10',
    renewalDate: 'Jan 10',
    status: 'pending',
    paymentHistory: [{ date: 'Jan 10, 2024', amount: 24800, status: 'completed' }],
  },
];

// Chronological events for the elder's timeline, grouped by type for filtering.
export const TIMELINE_EVENTS = [
  { id: 'tl-1', date: 'Nov 24', type: 'appointment', title: 'Eye check-up with Dr. Sharma' },
  { id: 'tl-2', date: 'Nov 25', type: 'prescription', title: 'Metformin refill needed' },
  { id: 'tl-3', date: 'Nov 21', type: 'report', title: 'Blood test report to collect' },
  { id: 'tl-4', date: 'Nov 05', type: 'appointment', title: 'Physician visit completed' },
  { id: 'tl-5', date: 'Nov 05', type: 'prescription', title: 'New prescription added' },
  { id: 'tl-6', date: 'Nov 03', type: 'report', title: 'HbA1c lab report added' },
  { id: 'tl-7', date: 'Oct 19', type: 'appointment', title: 'Dental cleaning completed' },
  { id: 'tl-8', date: 'Oct 14', type: 'report', title: 'Discharge summary added' },
];

// Daily activity log entries recorded by the caretaker or elder for today.
export const ACTIVITY_LOG = [
  { id: 'act-1', time: '7:30 AM', text: 'Breakfast taken' },
  { id: 'act-2', time: '7:45 AM', text: 'Morning tablets taken' },
  { id: 'act-3', time: '9:00 AM', text: 'Short walk in the garden, 15 minutes' },
  { id: 'act-4', time: '11:20 AM', text: 'Blood pressure noted: 130/84, slightly high' },
  { id: 'act-5', time: '1:15 PM', text: 'Lunch taken, light portion' },
];

// Summary counts shown on the admin dashboard.
export const ADMIN_STATS = {
  elders: 3,
  familyMembers: 4,
  caretakers: 2,
  volunteers: 2,
  openRequests: 1,
  upcomingAppointments: 3,
  activeRides: 2,
  monthlyPremiumCollected: 3500,
};

// Missed-dose alerts raised when a scheduled medicine slot is not confirmed as taken.
export const MISSED_DOSE_ALERTS = [
  { id: 'miss-1', medicine: 'Metformin 500 mg', slot: 'post-breakfast', date: 'Nov 17', notifiedTo: 'Anjali' },
  { id: 'miss-2', medicine: 'Amlodipine 5 mg', slot: 'morning', date: 'Nov 19', notifiedTo: 'Ravi' },
];
