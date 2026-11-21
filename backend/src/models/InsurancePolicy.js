import mongoose from "mongoose";

const insurancePolicySchema = new mongoose.Schema(
  {
    elderId: { type: mongoose.Schema.Types.ObjectId, ref: "Elder", required: true },
    provider: { type: String, required: true },
    policyType: { type: String },
    policyNumber: { type: String, required: true },
    validFrom: { type: Date },
    validTo: { type: Date },
    sumInsured: { type: Number },
    coverageItems: { type: [String], default: [] },
    exclusions: { type: String },
    helplineNumber: { type: String },
    cardImageUrl: { type: String },
  },
  { timestamps: true }
);

// Replaces all but the last 4 characters with a bullet. A policy number of 4
// characters or fewer is masked entirely rather than shown in full.
export function maskPolicyNumber(policyNumber) {
  if (!policyNumber) return policyNumber;
  const str = String(policyNumber);
  if (str.length <= 4) return "•".repeat(str.length);
  return "•".repeat(str.length - 4) + str.slice(-4);
}

function toPublicFields(policy) {
  return {
    id: String(policy._id),
    elderId: String(policy.elderId),
    provider: policy.provider,
    policyType: policy.policyType,
    validFrom: policy.validFrom,
    validTo: policy.validTo,
    sumInsured: policy.sumInsured,
    coverageItems: policy.coverageItems ?? [],
    exclusions: policy.exclusions,
    helplineNumber: policy.helplineNumber,
    cardImageUrl: policy.cardImageUrl,
  };
}

// Full policyNumber included. Use for a single create/update response, never for a list.
export function toPublicInsurance(policy) {
  return { ...toPublicFields(policy), policyNumber: policy.policyNumber };
}

// policyNumber masked. Use for every list response.
export function toPublicInsuranceMasked(policy) {
  return { ...toPublicFields(policy), policyNumber: maskPolicyNumber(policy.policyNumber) };
}

const InsurancePolicy = mongoose.model("InsurancePolicy", insurancePolicySchema);

export default InsurancePolicy;
