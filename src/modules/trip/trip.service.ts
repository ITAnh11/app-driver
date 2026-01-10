import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Trip, TripStatus } from 'src/entities/trip.entity';
import { User } from 'src/entities/user.entity';
import { RoomTripGateway } from './roomTrip.gateway';


@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly roomTripGateway: RoomTripGateway,
  ) {}

  async joinTrip(customerId: number, tripId: number) {
  // Lấy thông tin khách hàng
    const customer = await this.userRepository.findOne({
      where: { id: customerId },
      relations: ['joinedTrips'],
    });

    // Kiểm tra xem khách đã được duyệt chuyến nào chưa
    // const hasActiveTrip = await this.tripRepository.exists({
    //   where: {
    //     approvedCustomers: { id: customerId },
    //     status: TripStatus.ACTIVE,
    //   },
    // });

    // if (hasActiveTrip) {
    //   throw new BadRequestException('Bạn đã tham gia một chuyến khác đang hoạt động!');
    // }

    // Lấy chuyến muốn tham gia
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['customers'],
    });

    if (!trip) throw new NotFoundException('Không tìm thấy chuyến đi!');
    if (trip.customers.length >= trip.slot) {
      throw new BadRequestException('Chuyến đã đầy!');
    }
    if (customerId === trip.driver.id) {
      throw new BadRequestException('Tài xế không thể tham gia chuyến của chính mình!');
    }
    // Thêm khách vào danh sách
    if (customer != null) {
      trip.customers.push(customer);
      await this.userRepository.save(customer);
    }

    await this.tripRepository.save(trip);
    // Thông báo cho tài xế khi có khách mới tham gia
    this.roomTripGateway.notifyNewCustomerAddedToDriver(
      trip.driver.id.toString(),
      trip.id.toString(),
      customerId.toString()
    );
    return trip;
  }

  // 🚗 Tài xế tạo chuyến mới
  async createTrip(driverId: number, dto: CreateTripDto) {
    // Tìm tài xế
    const driver = await this.userRepository.findOne({
      where: { id: driverId },
    });
    if (!driver) {
      throw new NotFoundException('Không tìm thấy tài xế!');
    }

    // 🔍 Kiểm tra tài xế đã có chuyến hoạt động chưa
    const hasActiveTrip = await this.tripRepository.exists({
      where: {
        driver: { id: driverId },
        status: TripStatus.ACTIVE,
      },
    });

    if (hasActiveTrip) {
      throw new BadRequestException(
        'Bạn đã có chuyến đi đang hoạt động! Không thể tạo thêm.',
      );
    }

    // Tạo chuyến đi mới
    const trip = this.tripRepository.create({
      driver,
      slot: dto.slot,
      departureTime: dto.departureTime,
      startLocation: dto.startLocation,
      destination: dto.destination,
      status: TripStatus.ACTIVE,
      customers: [], // Chưa có khách nào khi mới tạo
    });

    await this.tripRepository.save(trip);

    return trip;
  }

  async getAllTrips(userId: number) {
    const trips = await this.tripRepository.find({
      relations: ['driver', 'customers'],
      where: { status: TripStatus.ACTIVE },
      order: { departureTime: 'ASC' },
    });

    return trips
    .filter(trip =>
      trip.driver?.id !== userId &&
      (!trip.customers || !trip.customers.some(c => c.id === userId))
    )
    .map(trip => ({
      id: trip.id,
      slot: trip.slot,
      departureTime: trip.departureTime,
      startLocation: trip.startLocation,
      destination: trip.destination,
      status: trip.status,
      driver: {
        id: trip.driver.id,
        email: trip.driver.email,
        // Thêm các trường cần thiết khác nếu muốn
      },
      customerIds: trip.customerIds,
    }));
  }

  async findTripsByLocationAndTime(startLocation: string, destination: string, afterTime: Date, userId: number ) {
    const trips = await this.tripRepository.find({
      where: {
        startLocation,
        destination,
        //departureTime: MoreThan(afterTime),
        status: TripStatus.ACTIVE,
      },
      // relations: ['driver', 'customers'],
      order: { departureTime: 'ASC' },
    });

    // Lọc các chuyến có số khách < số slot
    return trips
      .filter(trip => trip.customerIds.length < trip.slot)
      .filter(trip =>
        trip.driver?.id !== userId &&
        (!trip.customers || !trip.customers.some(c => c.id === userId))
      )
      .map(trip => ({
        id: trip.id,
        slot: trip.slot,
        departureTime: trip.departureTime,
        startLocation: trip.startLocation,
        destination: trip.destination,
        status: trip.status,
        driver: {
          id: trip.driver.id,
          email: trip.driver.email,
        },
        customerIds: trip.customerIds,
      }));
  }

  async cancelTrip(driverId: number, tripId: number) {
    // Tìm chuyến đi theo id và tài xế
    const trip = await this.tripRepository.findOne({
      where: {
        id: tripId,
        driver: { id: driverId },
        status: TripStatus.ACTIVE,
      },
    });

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến đi đang hoạt động của tài xế!');
    }

    // Đổi trạng thái chuyến đi thành CANCELED
    trip.status = TripStatus.CANCELED;
    await this.tripRepository.save(trip);
    // Gửi thông báo hủy chuyến đến các khách trong room
    return { message: 'Chuyến đi đã được hủy thành công!', trip };
  }

  async outTrip(customerId: number, tripId: number) {
    // Lấy chuyến đi, kèm danh sách khách đã duyệt
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['customers', 'approvedCustomers'],
    });

    if (!trip) throw new NotFoundException('Không tìm thấy chuyến đi!');

    // Xóa khỏi approvedCustomers nếu có
    const approvedIndex = trip.approvedCustomers.findIndex(c => c.id === customerId);
    if (approvedIndex !== -1) {
      trip.approvedCustomers.splice(approvedIndex, 1);
    }

    // Xóa khỏi customers nếu có
    const customerIndex = trip.customers.findIndex(c => c.id === customerId);
    if (customerIndex !== -1) {
      trip.customers.splice(customerIndex, 1);
    }

    // Nếu không có trong cả hai danh sách thì báo lỗi
    if (approvedIndex === -1 && customerIndex === -1) {
      throw new BadRequestException('Bạn không tham gia chuyến này!');
    }

    await this.tripRepository.save(trip);
    return { message: 'Bạn đã rời khỏi chuyến đi thành công!', trip };

  }

  async getCurrentTrip(userId: number): Promise<any> {
    // Tìm chuyến đi ACTIVE mà user đã được duyệt (approvedCustomers) hoặc là tài xế
    const trip = await this.tripRepository.findOne({
      where: [
        {
          status: TripStatus.ACTIVE,
          approvedCustomers: { id: userId },
        },
        {
          status: TripStatus.ACTIVE,
          driver: { id: userId },
        },
        {
          status: TripStatus.ACTIVE,
          customers: { id: userId },
        }
      ],
      relations: ['driver', 'customers', 'approvedCustomers'],
      order: { departureTime: 'DESC' },
    });
    if (!trip) throw new NotFoundException('Bạn không có chuyến đi nào đang hoạt động mà đã được duyệt hoặc là tài xế!');
    return trip;
  }

  async approveCustomer(driverId: number, tripId: number, customerId: number) {
    tripId = Number(tripId);
    customerId = Number(customerId);
    console.log('ApproveCustomer called with driverId:', driverId, 'tripId:', tripId, 'customerId:', customerId);
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['driver', 'customers', 'approvedCustomers'],
    });

    if (!trip) throw new NotFoundException('Không tìm thấy chuyến đi!');
    if (trip.driver.id !== driverId) {
      throw new BadRequestException('Bạn không phải tài xế của chuyến này!');
    }

    // Kiểm tra khách đã đăng ký chưa
    const customer = trip.customers.find(c => c.id === customerId);
    if (!customer) {
      throw new BadRequestException('Khách chưa đăng ký chuyến này!');
    }

    // Kiểm tra đã duyệt chưa
    if (trip.approvedCustomers.some(c => c.id === customerId)) {
      throw new BadRequestException('Khách đã được duyệt!');
    }

    // Thêm vào danh sách đã duyệt
    trip.approvedCustomers.push(customer);

    // Xóa khỏi danh sách customers (chưa duyệt)
    const customerIndex = trip.customers.findIndex(c => c.id === customerId);
    if (customerIndex !== -1) {
      trip.customers.splice(customerIndex, 1);
    }

    await this.tripRepository.save(trip);

    // Gửi thông báo realtime cho khách vừa được duyệt
    this.roomTripGateway.notifyUserApproved(customerId.toString(), tripId.toString());

    return { message: 'Duyệt khách thành công!', trip };
  }

  // Lấy thông tin chuyến đi theo ID
  async getTripById(tripId: number) {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['driver', 'customers', 'approvedCustomers'],
    });
    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến đi!');
    }
    return trip;
  }  
}