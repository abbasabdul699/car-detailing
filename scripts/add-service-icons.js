// MongoDB Shell Commands to Add Icons to Services
// Copy and paste these commands into MongoDB Compass or MongoDB Shell

// Switch to the car-detailing database
use('car-detailing');

// Update Interior Services
db.Service.updateOne(
  { name: "Vacuuming" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/vacuuming-icon.png" } }
);

db.Service.updateOne(
  { name: "Carpet & Upholstery Shampooing & Steaming" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/carpet-shampoo-icon.png" } }
);

db.Service.updateOne(
  { name: "Carpet & Upholstery Shampooing" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/carpet-shampoo-icon.png" } }
);

db.Service.updateOne(
  { name: "Leather Cleaning & Conditioning" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/leather-cleaning-icon.png" } }
);

db.Service.updateOne(
  { name: "Dashboard, Console & Door Panel Cleaning" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/dashboard-cleaning-icon.png" } }
);

db.Service.updateOne(
  { name: "Window & Mirror Cleaning (Interior)" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/window-cleaning-icon.png" } }
);

db.Service.updateOne(
  { name: "Odor Elimination" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/odor-elimination-icon.png" } }
);

db.Service.updateOne(
  { name: "Stain Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/stain-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Door Jamb Cleaning" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/door-jamb-cleaning-icon.png" } }
);

db.Service.updateOne(
  { name: "Pet Hair Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/pet-hair-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Vomit Clean Up" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/vomit-cleanup-icon.png" } }
);

// Update Exterior Services
db.Service.updateOne(
  { name: "Hand Wash & Dry" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/hand-wash-icon.png" } }
);

db.Service.updateOne(
  { name: "Waxing & Polishing" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/waxing-polishing-icon.png" } }
);

db.Service.updateOne(
  { name: "Clay Bar Treatment" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/clay-bar-treatment-icon.png" } }
);

db.Service.updateOne(
  { name: "Tire Cleaning & Dressing" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/tire-cleaning-icon.png" } }
);

db.Service.updateOne(
  { name: "Wheel & Rim Detailing" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/wheel-rim-detailing-icon.png" } }
);

db.Service.updateOne(
  { name: "Bug & Tar Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/bug-tar-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Trim Restoration" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/trim-restoration-icon.png" } }
);

db.Service.updateOne(
  { name: "Engine Bay Cleaning" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/engine-bay-cleaning-icon.png" } }
);

db.Service.updateOne(
  { name: "Paint Correction" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/paint-correction-icon.png" } }
);

db.Service.updateOne(
  { name: "Ceramic Coating" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/ceramic-coating-icon.png" } }
);

db.Service.updateOne(
  { name: "Paint Sealant or Ceramic Coating" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/paint-sealant-icon.png" } }
);

// Update Additional Services
db.Service.updateOne(
  { name: "Car Seat Cleaning" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/car-seat-cleaning-icon.png" } }
);

db.Service.updateOne(
  { name: "Dog Hair Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/dog-hair-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Headlight Restoration" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/headlight-restoration-icon.png" } }
);

db.Service.updateOne(
  { name: "Mold Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/mold-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Odor Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/odor-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Overspray Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/overspray-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Tree Sap Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/tree-sap-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Limescale Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/limescale-removal-icon.png" } }
);

db.Service.updateOne(
  { name: "Scratch Removal" },
  { $set: { icon: "https://reevacar.s3.us-east-2.amazonaws.com/service-icons/scratch-removal-icon.png" } }
);

// Verify updates
print("✅ All service icons have been updated!");
print("📊 Total services with icons: " + db.Service.countDocuments({ icon: { $exists: true, $ne: "" } }));
print("📊 Total services: " + db.Service.countDocuments({}));

// Show services without icons (if any)
print("\n⚠️  Services without icons:");
db.Service.find({ $or: [{ icon: { $exists: false } }, { icon: "" }] }).forEach(function(service) {
  print("- " + service.name);
});
