import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { UserDataRegistry } from './user-data.registry.js';

/** GLB-013 : registre global, injecté par le module auth (suppression) et le module account (export). */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [UserDataRegistry],
  exports: [UserDataRegistry],
})
export class UserDataModule {}
