export type Pair = { title: string; detail: string }

export type SupplierRef = {
  id: string
  name: string
  email?: string | null
  address?: string | null
  country?: string | null
  country_code?: string | null
}

export type Product = {
  id: string
  name: string
  manufacturer?: string;
  description?: string
  image?: string
  image_url?: string | string[]
  price?: number
  visible?: boolean
  order?: number
  features?: string[]
  applications?: string[]
  characteristics?: string[];
  created_at?: string;
  updated_at?: string;
  unit_size?: string;
  stock?: number;
  sku?: string;
  measurement_type?: string;
  measurement_unit?: string;
  measurement_type_other?: string;
  measurement_unit_other?: string;
  supplier?: string | SupplierRef | null;
}

export type NewProduct = Partial<Product> & {
  _file?: File | null
  supplier_email?: string | null
  supplier_address?: string | null
  supplier_country?: string | null
}

export type Alert = { type: 'success' | 'error'; message: string } | null

export type UnitLabels = Record<string, string>
