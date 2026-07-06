import assert from "node:assert";
import { classifyMessages } from "../../core/models/classifier.js";

const personalAdmin = classifyMessages("Untitled", [
  {
    role: "user",
    text: "Can you help me understand my travel reimbursement policy for hotel receipts and meal limits?",
    timestamp: "2026-07-02T09:00:00.000Z"
  }
]);

assert.ok(personalAdmin, "Expected personal admin sample to classify");
assert.notEqual(personalAdmin?.summaryLabel, "Discussion", "Expected something more specific than a generic fallback");
assert.ok(
  personalAdmin?.summaryLabel.includes("Travel Reimbursement") ||
    personalAdmin?.summaryLabel.includes("Hotel Receipts") ||
    personalAdmin?.summaryLabel.includes("Meal Limits"),
  "Expected summary label to reflect the user's own phrasing"
);

const homeCare = classifyMessages("Untitled", [
  {
    role: "user",
    text: "Why are my tomato leaves turning yellow after heavy rain and what should I change first?",
    timestamp: "2026-07-02T09:05:00.000Z"
  }
]);

assert.ok(homeCare, "Expected home care sample to classify");
assert.notEqual(homeCare?.summaryLabel, "Discussion", "Expected a readable label for non-technical content");
assert.ok(
  homeCare?.summaryLabel.includes("Tomato Leaves") || homeCare?.summaryLabel.includes("Heavy Rain"),
  "Expected summary label to generalize beyond technical domains"
);

const passport = classifyMessages("Untitled", [
  {
    role: "user",
    text: "how do i renew my passport and what documents do i need for the appointment",
    timestamp: "2026-07-06T10:00:00.000Z"
  }
]);

assert.ok(passport, "Expected passport sample to classify");
assert.notEqual(passport?.domain, "DevOps", "Expected substring matches like passport/port not to misclassify the domain");
assert.ok(
  passport?.summaryLabel.includes("Renew Passport") || passport?.summaryLabel.includes("Passport"),
  "Expected passport sample to keep a readable subject label"
);

const household = classifyMessages("Untitled", [
  {
    role: "user",
    text: "why does my cat litter box make the whole apartment smell and what should i change first",
    timestamp: "2026-07-06T10:05:00.000Z"
  }
]);

assert.ok(household, "Expected household sample to classify");
assert.ok(
  household?.summaryLabel.includes("Cat Litter") || household?.summaryLabel.includes("Apartment Smell"),
  "Expected summary label to drop generic helper words like does/should"
);

const volunteer = classifyMessages("Untitled", [
  {
    role: "user",
    text: "how should i organize volunteer shifts for a school fundraiser across two weekends",
    timestamp: "2026-07-06T10:10:00.000Z"
  }
]);

assert.ok(volunteer, "Expected volunteer sample to classify");
assert.equal(volunteer?.intent, "planning", "Expected volunteer scheduling language to classify as planning");
assert.ok(
  volunteer?.summaryLabel.includes("Volunteer Shifts") || volunteer?.summaryLabel.includes("School Fundraiser"),
  "Expected volunteer planning sample to keep the user's actual subject"
);

const internetBill = classifyMessages("Untitled", [
  {
    role: "user",
    text: "my internet bill went up again how do i compare plans without losing speed",
    timestamp: "2026-07-06T10:15:00.000Z"
  }
]);

assert.ok(internetBill, "Expected internet billing sample to classify");
assert.equal(internetBill?.intent, "research", "Expected plan-comparison language to classify as research");
assert.ok(
  internetBill?.summaryLabel.includes("Internet Bill") || internetBill?.summaryLabel.includes("Compare Plans"),
  "Expected billing sample to keep a readable consumer-facing subject"
);

const passportAppointment = classifyMessages("Untitled", [
  {
    role: "user",
    text: "what should i pack for a same day passport appointment if i already have my old passport",
    timestamp: "2026-07-06T10:20:00.000Z"
  }
]);

assert.ok(passportAppointment, "Expected passport appointment sample to classify");
assert.ok(
  passportAppointment?.summaryLabel.includes("Passport Appointment") ||
    passportAppointment?.summaryLabel.includes("Passport"),
  "Expected passport appointment sample to avoid helper-word-heavy labels"
);

const washingMachine = classifyMessages("Untitled", [
  {
    role: "user",
    text: "the washing machine smells musty after each cycle what should i clean first",
    timestamp: "2026-07-06T10:25:00.000Z"
  }
]);

assert.ok(washingMachine, "Expected washing machine sample to classify");
assert.ok(
  washingMachine?.summaryLabel.includes("Washing Machine") || washingMachine?.summaryLabel.includes("Musty Cycle"),
  "Expected washing machine sample to keep a readable household-maintenance subject"
);

const preschool = classifyMessages("Untitled", [
  {
    role: "user",
    text: "best way to compare preschool waiting lists and tour notes",
    timestamp: "2026-07-06T10:30:00.000Z"
  }
]);

assert.ok(preschool, "Expected preschool planning sample to classify");
assert.equal(preschool?.intent, "research", "Expected preschool comparison language to classify as research");
assert.ok(
  preschool?.summaryLabel.includes("Preschool Waiting") ||
    preschool?.summaryLabel.includes("Waiting Lists") ||
    preschool?.summaryLabel.includes("Tour Notes"),
  "Expected preschool sample to retain a readable real-world subject"
);

console.log("classifier-generalization.test.ts passed");
