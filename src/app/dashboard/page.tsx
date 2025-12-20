'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  EnvelopeIcon,
  CalculatorIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { formatCLP } from '@/lib/format'

interface DashboardStats {
  totalContacts: number
  totalQuotes: number
  totalRevenue: number
  pendingQuotes: number
}

interface ContactForm {
  id: string
  name: string
  email: string
  phone: string
  message: string
  status: string
  createdAt: string
}

interface Quote {
  id: string
  name: string
  email: string
  phone: string
  area: number
  materialType: string
  estimatedPrice: number
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalQuotes: 0,
    totalRevenue: 0,
    pendingQuotes: 0,
  })
  const [, setContacts] = useState<ContactForm[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activeTab] = useState('overview');

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      // Fetch quotes
      const quotesResponse = await fetch('/api/quotes')
      if (!quotesResponse.ok) {
        throw new Error(`HTTP error! status: ${quotesResponse.status}`)
      }
      const quotesData = await quotesResponse.json()
      const quotesArray = Array.isArray(quotesData) ? quotesData : []
      setQuotes(quotesArray)

      // Fetch contacts
      const contactsResponse = await fetch('/api/contact')
      if (!contactsResponse.ok) {
        throw new Error(`HTTP error! status: ${contactsResponse.status}`)
      }
      const contactsData = await contactsResponse.json()
      const contactsArray = Array.isArray(contactsData) ? contactsData : []
      setContacts(contactsArray)

      // Calculate stats
      setStats({
        totalContacts: contactsArray.length,
        totalQuotes: quotesArray.length,
        totalRevenue: quotesArray.reduce((sum: number, quote: Quote) => sum + (quote.estimatedPrice || 0), 0),
        pendingQuotes: quotesArray.filter((quote: Quote) => quote.status === 'PENDING').length,
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      setQuotes([])
      setContacts([])
      setStats({
        totalContacts: 0,
        totalQuotes: 0,
        totalRevenue: 0,
        pendingQuotes: 0,
      })
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const statCards = [
    {
      name: 'Formularios de Contacto',
      value: stats.totalContacts,
      icon: EnvelopeIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Cotizaciones Totales',
      value: stats.totalQuotes,
      icon: CalculatorIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Cotizaciones Pendientes',
      value: stats.pendingQuotes,
      icon: ChartBarIcon,
      color: 'bg-yellow-500',
    },
    {
      name: 'Ingresos Estimados',
      value: `$${formatCLP(stats.totalRevenue)}`,
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
    },
  ]


  return (
    <>
      {/* Remove DashboardHeader, now rendered in layout */}
      {/* <DashboardHeader title="Panel Administrativo" subtitle={`Bienvenido, ${session.user?.name || session.user?.email}`}/> */}
      <main className="flex-1 p-4 mt-2">
        {activeTab === 'overview' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {statCards.map((stat) => (
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 ${stat.color} rounded-md flex items-center justify-center`}>
                        <stat.icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {stat.name}
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">{stat.value}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Actividad Reciente
                </h3>
                <div className="space-y-4">
                  {Array.isArray(quotes) && quotes.slice(0, 5).map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Nueva cotización de {quote.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {quote.area}m² - ${formatCLP(quote.estimatedPrice)}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        quote.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {quote.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Cotizaciones Recibidas
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Área
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Material
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio Estimado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quotes.map((quote) => (
                        <tr key={quote.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{quote.name}</div>
                              <div className="text-sm text-gray-500">{quote.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quote.area}m²
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {quote.materialType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${formatCLP(quote.estimatedPrice)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              quote.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {quote.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div>
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Formularios de Contacto
                </h3>
                <p className="text-gray-600">
                  Esta sección mostrará los formularios de contacto recibidos.
                  Funcionalidad disponible próximamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Configuración del Sistema
                </h3>
                <p className="text-gray-600">
                  Panel de configuración para gestionar productos, precios y configuraciones del sistema.
                  Funcionalidad disponible próximamente.
                </p>
              </div>
            </div>
          </div>
        )}
        </main>
      </>
  )
}