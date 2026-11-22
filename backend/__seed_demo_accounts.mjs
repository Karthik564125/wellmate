// One-off setup script: creates (or reuses) 3 real Firebase + Mongo accounts
// and links the two family ones to the elder. Deleted right after running -
// not part of the app.
import { connectDB } from "./src/config/db.js";
import { getFirebaseAuth } from "./src/FireBase/firebase.js";
import User from "./src/models/User.js";
import Elder from "./src/models/Elder.js";
import CareLink, { CARELINK_PERMISSIONS } from "./src/models/CareLink.js";
import mongoose from "mongoose";

const PASSWORD = "Wellmate123!";

const ACCOUNTS = [
  { email: "savithriamma@gmail.com", name: "Savithri Amma", role: "elder" },
  { email: "ram@gmail.com", name: "Ram", role: "family" },
  { email: "sangeetha@gmail.com", name: "Sangeetha", role: "family" },
];

async function ensureFirebaseUser(auth, email, password) {
  try {
    return await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      return auth.createUser({ email, password, emailVerified: true });
    }
    throw err;
  }
}

async function ensureAppUser({ authUid, name, role, email }) {
  let user = await User.findOne({ authUid });
  if (!user) {
    user = await User.create({ authUid, name, role, email });
    console.log(`  created Mongo User ${user._id}`);
  } else {
    console.log(`  reused existing Mongo User ${user._id}`);
  }
  return user;
}

async function connectFamily(elderId, familyUser, relation) {
  let link = await CareLink.findOne({ elderId, userId: familyUser._id });
  if (!link) {
    link = await CareLink.create({
      elderId,
      userId: familyUser._id,
      relation,
      permissions: [...CARELINK_PERMISSIONS],
      status: "active",
      invitedBy: familyUser._id,
    });
    console.log(`  created CareLink ${link._id} (${relation})`);
  } else if (link.status !== "active") {
    link.status = "active";
    await link.save();
    console.log(`  reactivated CareLink ${link._id}`);
  } else {
    console.log(`  CareLink already active: ${link._id}`);
  }
  return link;
}

async function main() {
  await connectDB();
  const auth = getFirebaseAuth();

  const createdUsers = {};
  for (const acc of ACCOUNTS) {
    console.log(`\n${acc.email} (${acc.role}):`);
    const fbUser = await ensureFirebaseUser(auth, acc.email, PASSWORD);
    console.log(`  Firebase uid: ${fbUser.uid}`);
    const appUser = await ensureAppUser({ authUid: fbUser.uid, name: acc.name, role: acc.role, email: acc.email });
    createdUsers[acc.email] = appUser;
  }

  const elderUser = createdUsers["savithriamma@gmail.com"];
  let elder = await Elder.findOne({ userId: elderUser._id });
  if (!elder) {
    elder = await Elder.create({ userId: elderUser._id, displayName: "Savithri Amma" });
    console.log(`\ncreated Elder profile ${elder._id}`);
  } else {
    console.log(`\nreused existing Elder profile ${elder._id}`);
  }

  console.log("\nLinking family members:");
  await connectFamily(elder._id, createdUsers["ram@gmail.com"], "Son");
  await connectFamily(elder._id, createdUsers["sangeetha@gmail.com"], "Daughter");

  console.log("\nDone. Sign-in password for all 3 accounts:", PASSWORD);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
