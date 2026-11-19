/**
 * The tech's phone-call job form: what it needs before it can book.
 *
 * No imports, so the node test runner can load it.
 */

export type PhoneJobFields = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  zip: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  plate: string;
  agreed: boolean;
};

export type PhoneJobErrors = Partial<Record<keyof PhoneJobFields, string>>;

/** 'abc 1234' → 'ABC 1234'. Letters, digits, spaces and dashes, up to 10. */
export function normalizePlate(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10);
}

/** Upper case, no spaces or dashes, at most 17 characters. */
export function normalizeVinInput(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '').slice(0, 17);
}

export function validatePhoneJob(f: PhoneJobFields, thisYear: number): PhoneJobErrors {
  const e: PhoneJobErrors = {};
  if (!f.firstName.trim()) e.firstName = 'Enter a first name.';
  if (!f.lastName.trim()) e.lastName = 'Enter a last name.';
  let digits = f.phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) e.phone = 'Enter a 10-digit phone number.';
  const email = f.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Check the email, or leave it blank.';
  if (f.street.trim().length < 4) e.street = 'Enter the street address.';
  if (!f.city.trim()) e.city = 'Enter the city.';
  if (!/^\d{5}$/.test(f.zip.trim())) e.zip = 'Enter a 5-digit ZIP.';
  const vin = normalizeVinInput(f.vin);
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) e.vin = 'A VIN is 17 characters and never uses I, O or Q. Or leave it blank.';
  const year = Number(f.year.trim());
  if (!/^\d{4}$/.test(f.year.trim()) || year < 1950 || year > thisYear + 1) e.year = 'Enter the 4-digit year.';
  if (!f.make.trim()) e.make = 'Enter the make.';
  if (!f.model.trim()) e.model = 'Enter the model.';
  if (f.plate.trim() && !/^[A-Z0-9 -]{1,10}$/.test(normalizePlate(f.plate))) e.plate = 'Check the plate, or leave it blank.';
  if (!f.agreed) e.agreed = 'Read the customer the terms and check the box.';
  return e;
}
