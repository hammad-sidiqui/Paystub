import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { NgxMaskModule, IConfig } from 'ngx-mask'
import { PersistenceModule } from 'angular-persistence';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { DataService } from "./data.service";
import { NumberDirective } from './allow-only-numbers.directive';


import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { NavComponent } from './nav/nav.component';
import { HomeComponent } from './home/home.component';
import { StubFormComponent } from './stub-form/stub-form.component';
import { W2FormComponent } from './w2-form/w2-form.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { AboutUsComponent } from './about-us/about-us.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { ReviewsComponent } from './reviews/reviews.component';
import { StubSamplesComponent } from './stub-samples/stub-samples.component';
import { StubFaqComponent } from './stub-faq/stub-faq.component';
import { W2FaqComponent } from './w2-faq/w2-faq.component';
import { BlogComponent } from './blog/blog.component';
import { BlogInnerComponent } from './blog-inner/blog-inner.component';
import { W2CreatorComponent } from './w2-creator/w2-creator.component';
import { W2SamplesComponent } from './w2-samples/w2-samples.component';
import { OrderResendComponent } from './order-resend/order-resend.component';

// export const options: Partial<IConfig> | (() => Partial<IConfig>);

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    NavComponent,
    FooterComponent,
    HomeComponent,
    StubFormComponent,
    W2FormComponent,
    SpinnerComponent,
    NumberDirective,
    AboutUsComponent,
    PrivacyPolicyComponent,
    ContactUsComponent,
    ReviewsComponent,
    StubSamplesComponent,
    StubFaqComponent,
    W2FaqComponent,
    BlogComponent,
    BlogInnerComponent,
    W2CreatorComponent,
    W2SamplesComponent,
    OrderResendComponent
  ],
  imports: [
    BrowserModule,
    NgbModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,    
    NgxMaskModule.forRoot(/* options */),
    PersistenceModule
  ],
  providers: [
    DataService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
