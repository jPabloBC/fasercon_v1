import Link from 'next/link'
import Image from 'next/image'
import { PhoneIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline'

const navigation = {
  company: [
    { name: 'Sobre Nosotros', href: '#' },
    { name: 'Proyectos', href: '#proyectos' },
    { name: 'Productos', href: '#productos' },
    { name: 'Contacto', href: '#contacto' },
  ],
  services: [
    { name: 'Techos Metálicos', href: '#' },
    { name: 'Cubiertas Industriales', href: '#' },
    { name: 'Revestimientos', href: '#' },
    { name: 'Mantenimiento', href: '#' },
  ],
  social: [
    { name: 'Facebook', href: '#' },
    { name: 'Instagram', href: '#' },
    { name: 'LinkedIn', href: '#' },
    { name: 'WhatsApp', href: '#' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-gray-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <div className="flex items-center">
              <Image
                src="/assets/images/fasercon_logo_white.png"
                alt="Fasercom Logo"
                width={120}
                height={40}
                style={{ height: 'auto' }}
                className="h-10 w-auto"
              />
            </div>
            <p className="text-sm leading-6 text-gray-300">
              Especialistas en cubiertas, techos y revestimientos metálicos de alta calidad. 
              Más de 10 años de experiencia en proyectos industriales y residenciales.
            </p>
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <PhoneIcon className="h-5 w-5 mr-3" />
                <span className="text-sm">+56 9 2345678</span>
              </div>
              <div className="flex items-center text-gray-300">
                <EnvelopeIcon className="h-5 w-5 mr-3" />
                <span className="text-sm">info@fasercom.cl</span>
              </div>
              <div className="flex items-center text-gray-300">
                <MapPinIcon className="h-5 w-5 mr-3" />
                <span className="text-sm">Antofagasta, Chile</span>
              </div>
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Empresa</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.company.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="text-sm leading-6 text-gray-300 hover:text-white">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Servicios</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.services.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="text-sm leading-6 text-gray-300 hover:text-white">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-white">Síguenos</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.social.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href} className="text-sm leading-6 text-gray-300 hover:text-white">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-white">Cotización Rápida</h3>
                <p className="mt-6 text-sm leading-6 text-gray-300">
                  ¿Necesitas una cotización? Contáctanos por WhatsApp para una respuesta inmediata.
                </p>
                <Link
                  href="#cotizador"
                  className="mt-4 inline-block rounded-md bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Cotizar Ahora
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-xs leading-5 text-gray-400">
            &copy; 2024 Fasercom. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}