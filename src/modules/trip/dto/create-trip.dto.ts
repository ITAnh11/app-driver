import { IsDateString, IsNotEmpty, Matches } from 'class-validator';

export class CreateTripDto {
  @IsNotEmpty()
  slot: number;

  @IsNotEmpty()
  @IsDateString()
  departureTime: Date;

  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9 ,]+$/, {
    message: 'startLocation không được chứa ký tự đặc biệt',
  })
  startLocation: string;

  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9 ,]+$/, {
    message: 'destination không được chứa ký tự đặc biệt',
  })
  destination: string;
}