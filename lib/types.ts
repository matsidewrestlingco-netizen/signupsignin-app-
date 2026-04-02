// Mirrors web app interfaces exactly

export interface UserProfile {
  email: string;
  name: string;
  createdAt: Date;
  organizations: Record<string, 'admin' | 'member'>;
  superAdmin?: boolean;
}

export interface OrgBranding {
  primaryColor: string;
  logoUrl?: string;
}

export interface EmailSettings {
  sendConfirmations: boolean;
  sendReminders: boolean;
  reminderHoursBefore: number;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  ownerId: string;
  createdAt: Date;
  branding?: OrgBranding;
  emailSettings?: EmailSettings;
}

export interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface EventInput {
  title: string;
  startTime: Date;
  endTime?: Date;
  location: string;
  description: string;
  isPublic: boolean;
}

export interface Slot {
  id: string;
  name: string;
  category: string;
  quantityTotal: number;
  quantityFilled: number;
  startTime?: Date;
  endTime?: Date;
  description: string;
  createdAt: Date;
}

export interface SlotInput {
  name: string;
  category: string;
  quantityTotal: number;
  startTime?: Date;
  endTime?: Date;
  description: string;
}

export interface Signup {
  id: string;
  eventId: string;
  slotId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note: string;
  checkedIn: boolean;
  checkedInAt?: Date;
  createdAt: Date;
}

export interface SignupInput {
  eventId: string;
  slotId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note?: string;
}

export interface SlotTemplate {
  name: string;
  category: string;
  quantityTotal: number;
  description: string;
  durationMinutes?: number;
  offsetFromEventStart?: number;
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  eventTitle: string;
  eventDescription: string;
  eventLocation: string;
  durationHours?: number;
  slots: SlotTemplate[];
  createdAt: Date;
}
