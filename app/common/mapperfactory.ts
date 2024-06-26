import { ICipherType } from './ciphertypes';
import { mapBeaufort } from './mapBeaufort';
import { mapGronsfeld } from './mapGronsfeld';
import { Mapper } from './mapper';
import { mapPorta } from './mapPorta';
import { mapPortax } from './mapPortax';
import { mapVariant } from './mapVariant';
import { mapVigenere } from './mapVigenere';

export function mapperFactory(codevariant: ICipherType): Mapper {
    switch (codevariant) {
        case ICipherType.Beaufort:
            return new mapBeaufort();

        case ICipherType.Variant:
            return new mapVariant();

        case ICipherType.Gronsfeld:
            return new mapGronsfeld();

        case ICipherType.Porta:
            return new mapPorta();

        case ICipherType.Portax:
            return new mapPortax();

        default:
            return new mapVigenere();
    }
}
