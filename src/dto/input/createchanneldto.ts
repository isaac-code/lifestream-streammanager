import { IsNotEmpty, IsEnum, IsOptional, IsDate } from "class-validator";


export class CreateChannelDTO {
    @IsOptional()
    name: string;

    @IsOptional()
    description: string;

    @IsOptional()
    bannerImageLink: string;

    @IsOptional()
    imageLink: string;

    @IsOptional()
    subscribers: string;

    constructor(
        name?: string,
        description?: string,
        bannerImageLink?: string,
        imageLink?: string,
        subscribers?: string
    ) {
        this.name = name;
        this.description = description;
        this.bannerImageLink = bannerImageLink;
        this.imageLink = imageLink;
        this.subscribers = subscribers;
    }
}
