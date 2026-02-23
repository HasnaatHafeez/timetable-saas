export interface Section {
  id: string;
  name: string;
  year: string;
  institutionId: string;
}

export interface CreateSectionPayload {
  name: string;
  year: string;
}