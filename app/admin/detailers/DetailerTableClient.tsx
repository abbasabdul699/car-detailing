"use client";
import Link from "next/link";
import Image from "next/image";
import DeleteDetailerButton from "./DeleteDetailerButton";
import styles from "./admin-detailers.module.css";

export default function DetailerTableClient({ detailers }: { detailers: any[] }) {
  return (
    <div className={styles.adminDetailerListContainer}>
      <h1 className={styles.adminDetailerTitle}>All Detailers</h1>
      <div className="overflow-x-auto">
        <table className={styles.detailerTable}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Business Name</th>
              <th>Location</th>
              <th>Contact</th>
              <th>Services</th>
              <th>Price Range</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {detailers.map((d) => {
              const combinedImages = [
                ...d.images,
                ...d.detailerImages.map((img: any) => ({
                  url: img.url,
                  alt: img.alt
                }))
              ];
              const serviceNames = d.services.map((s: any) => s.service.name);

              return (
                <tr key={d.id}>
                  <td>
                    <div className="relative w-16 h-16">
                      <Image
                        src={combinedImages.find(img => img.type === 'profile')?.url || combinedImages[0]?.url || '/images/detailers/default-car.jpg'}
                        alt={combinedImages.find(img => img.type === 'profile')?.alt || combinedImages[0]?.alt || d.businessName}
                        fill
                        className="object-cover rounded-lg"
                        sizes="64px"
                      />
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/detailers/${d.id}`} className={styles.detailerLink}>
                      {d.businessName}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{d.description}</p>
                  </td>
                  <td>
                    <p>{d.city}, {d.state}</p>
                  </td>
                  <td>
                    <p>{d.email}</p>
                    <p className="text-sm text-gray-600">{d.phone}</p>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {serviceNames.slice(0, 3).map((service: string, index: number) => (
                        <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {service}
                        </span>
                      ))}
                      {serviceNames.length > 3 && (
                        <span className="text-xs text-gray-500">+{serviceNames.length - 3} more</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-[#389167]">{d.priceRange}</span>
                  </td>
                  <td>
                    <Link 
                      href={`/admin/detailers/${d.id}`}
                      className="text-sm bg-[#389167] text-white px-3 py-1 rounded hover:bg-[#2d7350] transition-colors mr-2"
                    >
                      Edit
                    </Link>
                    <DeleteDetailerButton detailerId={d.id} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 