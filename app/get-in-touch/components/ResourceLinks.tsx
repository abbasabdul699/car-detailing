export default function ResourceLinks() {
  const resources = [
    {
      title: 'Billing management',
      description: 'Access your billing page',
      href: '/billing'
    },
    {
      title: 'Subscription management',
      description: 'Upgrade or change your plan',
      href: '/subscription'
    },
    {
      title: 'Account management',
      description: 'Manage your account',
      href: '/account'
    }
  ];

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-lg font-medium mb-4">
        Get answers to quick questions with these resources:
      </h2>
      <ul className="space-y-4">
        {resources.map((resource, index) => (
          <li key={index}>
            <a 
              href={resource.href}
              className="group flex items-start"
            >
              <span className="text-[#0A2217] font-medium group-hover:underline">
                {resource.title}:
              </span>
              <span className="ml-2 text-gray-600 group-hover:text-[#0A2217]">
                {resource.description}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
} 