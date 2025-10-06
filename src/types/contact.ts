// Tipos para la tabla fasercon_contact_forms
export interface FaserconContactForm {
  id: string
  name: string
  email: string
  phone: string
  message: string
  status: 'PENDING' | 'REVIEWED' | 'CONTACTED' | 'CLOSED'
  created_at: string
  updated_at: string
  notes?: string
}

export interface CreateContactFormData {
  name: string
  email: string
  phone: string
  message: string
  status?: 'PENDING' | 'REVIEWED' | 'CONTACTED' | 'CLOSED'
}

export interface UpdateContactFormData extends Partial<CreateContactFormData> {
  id: string
  notes?: string
}