import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PilotsController } from './pilots.controller';
import { PilotsService } from './pilots.service';
import { Pilot, PilotSchema } from './entities/pilot.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pilot.name, schema: PilotSchema }]),
  ],
  controllers: [PilotsController],
  providers: [PilotsService],
})
export class PilotsModule {}
