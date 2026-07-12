import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users
  const users = await Promise.all([
    prisma.user.create({ data: { email: 'fleet@transitops.com', password: hashedPassword, name: 'Rajesh Kumar', role: 'fleet_manager' } }),
    prisma.user.create({ data: { email: 'dispatcher@transitops.com', password: hashedPassword, name: 'Priya Sharma', role: 'dispatcher' } }),
    prisma.user.create({ data: { email: 'safety@transitops.com', password: hashedPassword, name: 'Amit Singh', role: 'safety_officer' } }),
    prisma.user.create({ data: { email: 'finance@transitops.com', password: hashedPassword, name: 'Neha Gupta', role: 'financial_analyst' } }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create Vehicles
  const vehicleData = [
    { registrationNumber: 'KA-01-AB-1234', model: 'Tata Prima 4928', manufacturer: 'Tata Motors', type: 'Truck', capacity: 28, currentOdometer: 145000, acquisitionCost: 2800000, currentStatus: 'active' },
    { registrationNumber: 'KA-01-CD-5678', model: 'Ashok Leyland 4220', manufacturer: 'Ashok Leyland', type: 'Truck', capacity: 22, currentOdometer: 198000, acquisitionCost: 2400000, currentStatus: 'available' },
    { registrationNumber: 'KA-02-EF-9012', model: 'BharatBenz 3523R', manufacturer: 'BharatBenz', type: 'Truck', capacity: 25, currentOdometer: 87000, acquisitionCost: 3200000, currentStatus: 'available' },
    { registrationNumber: 'KA-02-GH-3456', model: 'Eicher Pro 6049', manufacturer: 'Eicher', type: 'Truck', capacity: 49, currentOdometer: 220000, acquisitionCost: 3500000, currentStatus: 'in_shop' },
    { registrationNumber: 'KA-03-IJ-7890', model: 'Mahindra Blazo X46', manufacturer: 'Mahindra', type: 'Truck', capacity: 46, currentOdometer: 56000, acquisitionCost: 3100000, currentStatus: 'available' },
    { registrationNumber: 'KA-03-KL-2345', model: 'Tata Ace Gold', manufacturer: 'Tata Motors', type: 'Van', capacity: 1.5, currentOdometer: 42000, acquisitionCost: 650000, currentStatus: 'available' },
    { registrationNumber: 'KA-04-MN-6789', model: 'Maruti Eeco Cargo', manufacturer: 'Maruti Suzuki', type: 'Van', capacity: 0.8, currentOdometer: 35000, acquisitionCost: 520000, currentStatus: 'active' },
    { registrationNumber: 'KA-04-OP-1122', model: 'Tata Starbus Ultra', manufacturer: 'Tata Motors', type: 'Bus', capacity: 52, currentOdometer: 310000, acquisitionCost: 4500000, currentStatus: 'available' },
    { registrationNumber: 'KA-05-QR-3344', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', type: 'Bus', capacity: 48, currentOdometer: 275000, acquisitionCost: 4200000, currentStatus: 'retired' },
    { registrationNumber: 'KA-05-ST-5566', model: 'Force Traveller 3700', manufacturer: 'Force Motors', type: 'Bus', capacity: 26, currentOdometer: 120000, acquisitionCost: 1800000, currentStatus: 'available' },
    { registrationNumber: 'KA-06-UV-7788', model: 'Tata Ultra T.16', manufacturer: 'Tata Motors', type: 'Truck', capacity: 16, currentOdometer: 95000, acquisitionCost: 1900000, currentStatus: 'available' },
    { registrationNumber: 'KA-06-WX-9900', model: 'BharatBenz 1617R', manufacturer: 'BharatBenz', type: 'Truck', capacity: 16, currentOdometer: 110000, acquisitionCost: 2100000, currentStatus: 'available' },
    { registrationNumber: 'KA-07-YZ-1133', model: 'Eicher Pro 3019', manufacturer: 'Eicher', type: 'Truck', capacity: 19, currentOdometer: 68000, acquisitionCost: 2200000, currentStatus: 'available' },
    { registrationNumber: 'KA-07-AB-2244', model: 'Mahindra Furio 17', manufacturer: 'Mahindra', type: 'Truck', capacity: 17, currentOdometer: 78000, acquisitionCost: 1950000, currentStatus: 'active' },
    { registrationNumber: 'KA-08-CD-3355', model: 'Toyota Innova Crysta', manufacturer: 'Toyota', type: 'Car', capacity: 7, currentOdometer: 25000, acquisitionCost: 2000000, currentStatus: 'available' },
    { registrationNumber: 'KA-08-EF-4466', model: 'Tata Signa 4825.TK', manufacturer: 'Tata Motors', type: 'Truck', capacity: 48, currentOdometer: 180000, acquisitionCost: 3800000, currentStatus: 'available' },
    { registrationNumber: 'KA-09-GH-5577', model: 'Ashok Leyland Boss 1920HB', manufacturer: 'Ashok Leyland', type: 'Truck', capacity: 20, currentOdometer: 155000, acquisitionCost: 2600000, currentStatus: 'in_shop' },
    { registrationNumber: 'KA-09-IJ-6688', model: 'BharatBenz 2828C', manufacturer: 'BharatBenz', type: 'Truck', capacity: 28, currentOdometer: 92000, acquisitionCost: 3400000, currentStatus: 'available' },
    { registrationNumber: 'KA-10-KL-7799', model: 'Eicher Pro 6048', manufacturer: 'Eicher', type: 'Truck', capacity: 48, currentOdometer: 205000, acquisitionCost: 3600000, currentStatus: 'available' },
    { registrationNumber: 'KA-10-MN-8800', model: 'Tata LPT 1613', manufacturer: 'Tata Motors', type: 'Truck', capacity: 16, currentOdometer: 165000, acquisitionCost: 1700000, currentStatus: 'available' },
  ];

  const now = new Date();
  const vehicles = await Promise.all(
    vehicleData.map(v => prisma.vehicle.create({
      data: {
        ...v,
        acquisitionDate: new Date(now.getTime() - Math.random() * 3 * 365 * 24 * 60 * 60 * 1000),
        insuranceExpiry: new Date(now.getTime() + (Math.random() * 365 - 30) * 24 * 60 * 60 * 1000),
        fitnessExpiry: new Date(now.getTime() + (Math.random() * 365 - 15) * 24 * 60 * 60 * 1000),
        rcExpiry: new Date(now.getTime() + (Math.random() * 730) * 24 * 60 * 60 * 1000),
        pollutionExpiry: new Date(now.getTime() + (Math.random() * 180 - 10) * 24 * 60 * 60 * 1000),
        qrCode: `QR-${v.registrationNumber}-${Date.now()}`,
      },
    }))
  );

  console.log(`✅ Created ${vehicles.length} vehicles`);

  // Create Drivers
  const driverData = [
    { name: 'Suresh Reddy', phone: '+91-9876543210', licenseNumber: 'KA-DL-2020-001234', licenseCategory: 'HMV', safetyScore: 95, performanceRating: 4.8, totalTrips: 245, totalDistance: 78500 },
    { name: 'Mohammed Irfan', phone: '+91-9876543211', licenseNumber: 'KA-DL-2019-005678', licenseCategory: 'HMV', safetyScore: 88, performanceRating: 4.5, totalTrips: 198, totalDistance: 64200 },
    { name: 'Venkatesh Babu', phone: '+91-9876543212', licenseNumber: 'KA-DL-2021-009012', licenseCategory: 'HMV', safetyScore: 92, performanceRating: 4.7, totalTrips: 156, totalDistance: 52000 },
    { name: 'Ravi Teja', phone: '+91-9876543213', licenseNumber: 'KA-DL-2018-003456', licenseCategory: 'HMV', safetyScore: 78, performanceRating: 4.0, totalTrips: 310, totalDistance: 98000 },
    { name: 'Dinesh Kumar', phone: '+91-9876543214', licenseNumber: 'KA-DL-2022-007890', licenseCategory: 'HGV', safetyScore: 96, performanceRating: 4.9, totalTrips: 120, totalDistance: 38000 },
    { name: 'Sanjay Patil', phone: '+91-9876543215', licenseNumber: 'KA-DL-2020-002345', licenseCategory: 'HMV', safetyScore: 82, performanceRating: 4.2, totalTrips: 275, totalDistance: 89000 },
    { name: 'Kiran Naik', phone: '+91-9876543216', licenseNumber: 'KA-DL-2019-006789', licenseCategory: 'HGV', safetyScore: 90, performanceRating: 4.6, totalTrips: 185, totalDistance: 60000 },
    { name: 'Ramesh Gowda', phone: '+91-9876543217', licenseNumber: 'KA-DL-2021-001122', licenseCategory: 'HMV', safetyScore: 55, performanceRating: 3.2, totalTrips: 340, totalDistance: 110000 },
    { name: 'Prakash Hegde', phone: '+91-9876543218', licenseNumber: 'KA-DL-2023-003344', licenseCategory: 'LMV', safetyScore: 98, performanceRating: 4.9, totalTrips: 45, totalDistance: 12000 },
    { name: 'Arun Shetty', phone: '+91-9876543219', licenseNumber: 'KA-DL-2020-005566', licenseCategory: 'HMV', safetyScore: 85, performanceRating: 4.3, totalTrips: 220, totalDistance: 71000 },
    { name: 'Naveen Raj', phone: '+91-9876543220', licenseNumber: 'KA-DL-2022-007788', licenseCategory: 'HMV', safetyScore: 91, performanceRating: 4.7, totalTrips: 130, totalDistance: 42000 },
    { name: 'Manoj Yadav', phone: '+91-9876543221', licenseNumber: 'KA-DL-2018-009900', licenseCategory: 'HGV', safetyScore: 76, performanceRating: 3.8, totalTrips: 295, totalDistance: 95000 },
    { name: 'Vikram Joshi', phone: '+91-9876543222', licenseNumber: 'KA-DL-2021-001133', licenseCategory: 'HMV', safetyScore: 93, performanceRating: 4.8, totalTrips: 165, totalDistance: 53000 },
    { name: 'Ganesh Murthy', phone: '+91-9876543223', licenseNumber: 'KA-DL-2019-002244', licenseCategory: 'HMV', safetyScore: 87, performanceRating: 4.4, totalTrips: 210, totalDistance: 68000 },
    { name: 'Harish Rao', phone: '+91-9876543224', licenseNumber: 'KA-DL-2023-003355', licenseCategory: 'LMV', safetyScore: 97, performanceRating: 5.0, totalTrips: 30, totalDistance: 8000 },
  ];

  const drivers = await Promise.all(
    driverData.map((d, i) => prisma.driver.create({
      data: {
        ...d,
        emergencyContact: `+91-98765${String(43300 + i).padStart(5, '0')}`,
        licenseExpiry: new Date(now.getTime() + (Math.random() * 365 - 20) * 24 * 60 * 60 * 1000),
        medicalCertExpiry: new Date(now.getTime() + (Math.random() * 365) * 24 * 60 * 60 * 1000),
        currentStatus: i < 3 ? 'on_trip' : i === 7 ? 'suspended' : 'available',
      },
    }))
  );

  console.log(`✅ Created ${drivers.length} drivers`);

  // Create Trips
  const locations = [
    ['Bangalore', 'Chennai'], ['Mumbai', 'Pune'], ['Hyderabad', 'Vijayawada'],
    ['Bangalore', 'Mysore'], ['Chennai', 'Coimbatore'], ['Pune', 'Nashik'],
    ['Bangalore', 'Mangalore'], ['Hyderabad', 'Warangal'], ['Chennai', 'Madurai'],
    ['Mumbai', 'Goa'], ['Bangalore', 'Hubli'], ['Chennai', 'Pondicherry'],
  ];

  const cargoTypes = ['General', 'Electronics', 'Food Products', 'Textiles', 'Chemicals', 'Machinery', 'Raw Materials', 'FMCG'];
  const statuses = ['completed', 'completed', 'completed', 'completed', 'completed', 'dispatched', 'in_progress', 'draft', 'cancelled'];

  const trips = [];
  for (let i = 0; i < 50; i++) {
    const [pickup, destination] = locations[i % locations.length];
    const status = statuses[i % statuses.length];
    const vehicleIdx = i % vehicles.length;
    const driverIdx = i % drivers.length;
    const distance = 100 + Math.random() * 900;
    const fuelEstimate = distance / (8 + Math.random() * 4);
    const costEstimate = distance * (8 + Math.random() * 4);
    const revenue = costEstimate * (1.2 + Math.random() * 0.5);

    const createdDate = new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000);

    const trip = await prisma.trip.create({
      data: {
        tripNumber: `TRP-${String(1000 + i).padStart(6, '0')}`,
        vehicleId: vehicles[vehicleIdx].id,
        driverId: drivers[driverIdx].id,
        pickup, destination,
        cargoWeight: Math.round(Math.random() * vehicles[vehicleIdx].capacity * 0.9),
        cargoType: cargoTypes[i % cargoTypes.length],
        estimatedDistance: Math.round(distance),
        estimatedFuel: Math.round(fuelEstimate),
        estimatedCost: Math.round(costEstimate),
        actualDistance: status === 'completed' ? Math.round(distance * (0.95 + Math.random() * 0.1)) : null,
        actualFuel: status === 'completed' ? Math.round(fuelEstimate * (0.9 + Math.random() * 0.2)) : null,
        actualCost: status === 'completed' ? Math.round(costEstimate * (0.95 + Math.random() * 0.1)) : null,
        revenue: Math.round(revenue),
        status,
        scheduledAt: createdDate,
        dispatchedAt: ['dispatched', 'in_progress', 'completed'].includes(status) ? new Date(createdDate.getTime() + 3600000) : null,
        startedAt: ['in_progress', 'completed'].includes(status) ? new Date(createdDate.getTime() + 7200000) : null,
        completedAt: status === 'completed' ? new Date(createdDate.getTime() + distance * 60000 / 50) : null,
        cancelledAt: status === 'cancelled' ? new Date(createdDate.getTime() + 1800000) : null,
        cancelReason: status === 'cancelled' ? 'Customer request' : null,
        createdAt: createdDate,
      },
    });
    trips.push(trip);
  }

  console.log(`✅ Created ${trips.length} trips`);

  // Create Fuel Logs
  const fuelLogs = [];
  for (let i = 0; i < 80; i++) {
    const vehicleIdx = i % vehicles.length;
    const quantity = 50 + Math.random() * 150;
    const costPerUnit = 85 + Math.random() * 20;
    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: vehicles[vehicleIdx].id,
        driverId: drivers[i % drivers.length].id,
        date: new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        quantity: Math.round(quantity * 10) / 10,
        costPerUnit: Math.round(costPerUnit * 100) / 100,
        totalCost: Math.round(quantity * costPerUnit),
        odometer: vehicles[vehicleIdx].currentOdometer - Math.round(Math.random() * 20000),
        fuelType: 'Diesel',
        station: ['Indian Oil', 'HP', 'Bharat Petroleum', 'Shell', 'Reliance'][i % 5],
      },
    });
    fuelLogs.push(log);
  }

  console.log(`✅ Created ${fuelLogs.length} fuel logs`);

  // Create Maintenance Records
  const maintenanceTypes = [
    { type: 'preventive', descriptions: ['Oil change & filter', 'Tire rotation', 'Brake inspection', 'AC service', 'Battery check'] },
    { type: 'corrective', descriptions: ['Engine overhaul', 'Transmission repair', 'Clutch replacement', 'Radiator fix', 'Suspension repair'] },
  ];

  const garages = ['AutoCare Workshop', 'FleetFix Garage', 'SpeedTech Service', 'RoadMaster Workshop', 'ProMech Auto'];

  const maintenanceRecords = [];
  for (let i = 0; i < 40; i++) {
    const mt = maintenanceTypes[i % 2];
    const desc = mt.descriptions[i % mt.descriptions.length];
    const scheduledDate = new Date(now.getTime() + (Math.random() * 90 - 45) * 24 * 60 * 60 * 1000);
    const isCompleted = scheduledDate < now && Math.random() > 0.3;
    const isInProgress = !isCompleted && scheduledDate < now;

    const record = await prisma.maintenance.create({
      data: {
        vehicleId: vehicles[i % vehicles.length].id,
        type: mt.type,
        description: desc,
        scheduledDate,
        completedDate: isCompleted ? new Date(scheduledDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        garageName: garages[i % garages.length],
        cost: Math.round(5000 + Math.random() * 45000),
        partsReplaced: isCompleted ? JSON.stringify(['Filter', 'Gasket', 'Belt'].slice(0, 1 + Math.floor(Math.random() * 3))) : null,
        status: isCompleted ? 'completed' : isInProgress ? 'in_progress' : 'scheduled',
        priority: ['low', 'medium', 'medium', 'high', 'critical'][i % 5],
      },
    });
    maintenanceRecords.push(record);
  }

  console.log(`✅ Created ${maintenanceRecords.length} maintenance records`);

  // Create Expenses
  const expenseCategories = ['fuel', 'maintenance', 'tolls', 'driver_salary', 'insurance', 'miscellaneous'];
  const expenseRecords = [];
  for (let i = 0; i < 100; i++) {
    const category = expenseCategories[i % expenseCategories.length];
    const amounts: Record<string, [number, number]> = {
      fuel: [2000, 15000], maintenance: [5000, 50000], tolls: [200, 2000],
      driver_salary: [15000, 35000], insurance: [10000, 50000], miscellaneous: [500, 5000],
    };
    const [min, max] = amounts[category];

    const expense = await prisma.expense.create({
      data: {
        category,
        amount: Math.round(min + Math.random() * (max - min)),
        description: `${category.replace('_', ' ')} expense`,
        vehicleId: Math.random() > 0.3 ? vehicles[i % vehicles.length].id : null,
        date: new Date(now.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      },
    });
    expenseRecords.push(expense);
  }

  console.log(`✅ Created ${expenseRecords.length} expenses`);

  // Create Notifications
  const notificationTypes = [
    { title: 'New trip assigned', message: 'A new trip has been assigned to your fleet.', type: 'info' },
    { title: 'Maintenance due', message: 'Vehicle KA-01-AB-1234 has maintenance due in 3 days.', type: 'warning' },
    { title: 'License expiring', message: 'Driver Suresh Reddy license expires in 15 days.', type: 'warning' },
    { title: 'Trip completed', message: 'Trip TRP-001000 has been completed successfully.', type: 'success' },
    { title: 'Insurance expired', message: 'Vehicle KA-05-QR-3344 insurance has expired.', type: 'danger' },
    { title: 'High fuel consumption', message: 'Vehicle KA-02-GH-3456 showing above average fuel consumption.', type: 'warning' },
    { title: 'Driver achievement', message: 'Driver Dinesh Kumar completed 120 trips milestone!', type: 'success' },
    { title: 'System update', message: 'TransitOps has been updated to version 2.0.', type: 'info' },
  ];

  for (const user of users) {
    for (let i = 0; i < 8; i++) {
      const n = notificationTypes[i];
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: n.title, message: n.message, type: n.type,
          read: Math.random() > 0.5,
          createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log(`✅ Created ${users.length * 8} notifications`);

  // Create Audit Logs
  const actions = ['created', 'updated', 'status_changed', 'dispatched', 'completed', 'login'];
  const entityTypes = ['vehicle', 'driver', 'trip', 'maintenance', 'user'];

  for (let i = 0; i < 30; i++) {
    await prisma.auditLog.create({
      data: {
        userId: users[i % users.length].id,
        action: actions[i % actions.length],
        entityType: entityTypes[i % entityTypes.length],
        entityId: vehicles[i % vehicles.length].id,
        details: JSON.stringify({ action: actions[i % actions.length] }),
        createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`✅ Created 30 audit logs`);
  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Fleet Manager:     fleet@transitops.com / password123');
  console.log('  Dispatcher:        dispatcher@transitops.com / password123');
  console.log('  Safety Officer:    safety@transitops.com / password123');
  console.log('  Financial Analyst: finance@transitops.com / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
