import { createAdminClient, findUserByEmail, readArg } from "./user-data-admin.mjs";

const email = readArg("email");
const confirmation = readArg("confirm");
if (!email || confirmation !== email) {
  throw new Error("Deletion requires --email user@example.com --confirm user@example.com with an exact match.");
}

const admin = createAdminClient();
const user = await findUserByEmail(admin, email);
const { error } = await admin.auth.admin.deleteUser(user.id);
if (error) throw error;
console.log(`Deleted account and cascading user data for ${email}.`);
