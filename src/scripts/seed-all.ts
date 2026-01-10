import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import { User } from '../entities/user.entity';
import { Trip, TripStatus } from '../entities/trip.entity';
import { UserBlackList } from '../entities/userBlackList.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { FCMToken } from '../entities/fcm-token.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '0977980400', // sửa lại cho đúng
  database: 'appdriver',
  entities: [User, Trip, UserBlackList, RefreshToken, FCMToken],
  synchronize: false,
});

async function seedAll() {
  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const tripRepo = AppDataSource.getRepository(Trip);
  const blackListRepo = AppDataSource.getRepository(UserBlackList);
  const refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
  const fcmTokenRepo = AppDataSource.getRepository(FCMToken);

  const locations = ['G2', 'GD4', 'GD3', 'G3', 'GD2'];

  // 1. Tạo 500 user
  const users: User[] = [];
  for (let i = 0; i < 500; i++) {
    const hashedPassword = bcrypt.hashSync('12345678', 10); // 10 là số vòng lặp
    const user = userRepo.create({
      email: `${i + 1}@gmail.com`, // email dạng số tăng dần
      password: hashedPassword, // mật khẩu mặc định
      isActivated: faker.datatype.boolean(),
    });
    users.push(await userRepo.save(user));
  }

  const availableUsers = [...users];

  // 2. Tạo 100 chuyến đi, mỗi chuyến có 1 tài xế và 2-5 khách
  for (let i = 0; i < 100 && availableUsers.length > 0; i++) {
    // Chọn tài xế ngẫu nhiên
    const driverIdx = faker.number.int({ min: 0, max: availableUsers.length - 1 });
    const driver = availableUsers.splice(driverIdx, 1)[0];

    // Chọn khách ngẫu nhiên, không trùng tài xế
    let customerPool = availableUsers.filter(u => u.id !== driver.id);
    const customerCount = Math.min(faker.number.int({ min: 2, max: 5 }), customerPool.length);
    const customers: User[] = [];
    for (let j = 0; j < customerCount; j++) {
      const idx = faker.number.int({ min: 0, max: customerPool.length - 1 });
      const customer = customerPool.splice(idx, 1)[0];
      customers.push(customer);
      // Loại khách khỏi availableUsers để không tham gia chuyến khác
      availableUsers.splice(availableUsers.findIndex(u => u.id === customer.id), 1);
    }

    const trip = tripRepo.create({
      driver,
      customers,
      slot: faker.number.int({ min: 4, max: 7 }),
      departureTime: faker.date.soon({ days: 30 }),
      startLocation: faker.helpers.arrayElement(locations),
      destination: faker.helpers.arrayElement(locations),
      status: faker.helpers.arrayElement([
        TripStatus.ACTIVE,
        TripStatus.COMPLETED,
        TripStatus.CANCELED,
      ]),
    });
    await tripRepo.save(trip);
  }

  // 3. Tạo 50 bản ghi blacklist ngẫu nhiên
  for (let i = 0; i < 50; i++) {
    const blocker = users[faker.number.int({ min: 0, max: users.length - 1 })];
    let blocked = users[faker.number.int({ min: 0, max: users.length - 1 })];
    while (blocked.id === blocker.id) {
      blocked = users[faker.number.int({ min: 0, max: users.length - 1 })];
    }
    const blacklist = blackListRepo.create({
      blocker,
      blocked,
    });
    await blackListRepo.save(blacklist);
  }

  // 4. Tạo refresh token cho mỗi user
  for (const user of users) {
    const refreshToken = refreshTokenRepo.create({
      user,
      userId: user.id,
      refreshToken: faker.string.uuid(),
      expireAt: faker.date.soon({ days: 30 }),
      createdAt: new Date(),
      deviceName: faker.word.sample(), // sửa lại dòng này
      userAgent: faker.internet.userAgent(),
    });
    await refreshTokenRepo.save(refreshToken);

    // Fake FCMToken liên kết với refreshToken vừa tạo
    const fcmToken = fcmTokenRepo.create({
      user,
      userId: user.id,
      refreshToken: refreshToken,
      refreshTokenId: refreshToken.id,
      token: faker.string.uuid(),
    });
    await fcmTokenRepo.save(fcmToken);
  }

  await AppDataSource.destroy();
  console.log('Seeded 500 users, 100 trips, 50 blacklists, 500 refresh tokens!');
}

seedAll();